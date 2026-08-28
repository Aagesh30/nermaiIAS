// @ts-nocheck
import { ResourceRepository } from './repository';
import { IResource } from './types';
import { StreamLogger } from '../../core/logger/StreamLogger';
import { AppError } from '../../core/errors/AppError';
import { AccessEngine } from '../../core/security/AccessEngine';
import { encrypt, decrypt } from '../../core/utils/encryption';
import { storage } from '../../infrastructure/firebase';
import crypto from 'crypto';
import axios from 'axios';
import { logResourceOpen } from './analytics';
import { FirebaseStorageProvider } from './providers/FirebaseStorageProvider';
import { GoogleDriveProvider } from './providers/GoogleDriveProvider';
import { IResourceProvider } from './providers/IResourceProvider';
import { uploadFileToGoogleDrive } from '../../services/google_drive';
import { generalCache } from '../../shared/utils/cache';

export class ResourceService {
  private repo = new ResourceRepository();

  private getBucket() {
    const bucketName = process.env.STORAGE_BUCKET || 'nermaiiasacademy-519c8-resources';
    return storage.bucket(bucketName);
  }

  async createResource(data: any, file: any, userId: string, tenantId: string) {
    let finalStoragePath = '';
    let checksum = '';
    let fileSize = data.fileSize ? parseInt(data.fileSize) : 0;
    let resolvedProvider = 'firebase_storage';
    
    // 1. Direct Local File Upload (Multipart)
    if (file) {
      fileSize = file.size;
      checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Try Google Drive first
      let driveSuccess = false;
      try {
        const driveResult = await uploadFileToGoogleDrive({
          fileName: `${Date.now()}_${file.originalname}`,
          mimeType: data.mimeType || file.mimetype,
          buffer: file.buffer,
          subPath: 'LMS/Resources'
        });
        if (driveResult && driveResult.previewUrl) {
          finalStoragePath = driveResult.previewUrl;
          resolvedProvider = 'google_drive';
          driveSuccess = true;
          console.log(`[Drive] Resource uploaded: ${driveResult.previewUrl}`);
        }
      } catch (driveErr: any) {
        console.warn('[Drive] Resource upload failed, falling back to Firebase Storage:', driveErr?.message);
      }

      // Fallback: Firebase Storage
      if (!driveSuccess) {
        const bucket = this.getBucket();
        const destPath = `resources/${tenantId}/${Date.now()}_${file.originalname}`;
        const bucketFile = bucket.file(destPath);
        await bucketFile.save(file.buffer, {
          metadata: { contentType: data.mimeType || file.mimetype }
        });
        finalStoragePath = destPath;
        resolvedProvider = 'firebase_storage';
      }
    } 
    // 2. Google Drive Import (admin pastes a Drive link)
    else if (data.googleDriveUrl) {
      const gDriveMatch = data.googleDriveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (gDriveMatch && gDriveMatch[1]) {
        finalStoragePath = gDriveMatch[1]; // Store only File ID
      } else {
        finalStoragePath = data.googleDriveUrl;
      }
      
      // Compute a fake checksum for Google Drive based on fileId if we don't download it
      checksum = crypto.createHash('sha256').update(finalStoragePath).digest('hex');
    } 
    // 3. Existing Firebase Asset or External Link
    else if (data.externalUrl || data.sourceUrl) {
      finalStoragePath = data.externalUrl || data.sourceUrl;
      checksum = crypto.createHash('sha256').update(finalStoragePath).digest('hex');
    } else {
      throw new AppError('Must provide a file, googleDriveUrl, or externalUrl', 400);
    }

      const provider = resolvedProvider || data.provider || (data.googleDriveUrl ? 'google_drive' : 'firebase_storage');

    const resourceData: IResource = {
      tenantId,
      title: data.title,
      description: data.description,
      type: data.type || 'PDF',
      provider: provider,
      visibility: data.visibility || 'private',
      storagePath: encrypt(finalStoragePath),
      checksum,
      version: 1,
      fileSize,
      mimeType: data.mimeType || (file ? file.mimetype : 'application/pdf'),
      pageCount: data.pageCount ? parseInt(data.pageCount) : undefined,
      thumbnail: data.thumbnail,
      tags: data.tags,
      
      // Extended Metadata
      author: data.author,
      language: data.language,
      readingTimeMins: data.readingTimeMins ? parseInt(data.readingTimeMins) : undefined,
      publishedDate: data.publishedDate,
      
      // Publishing Workflow & Scheduling
      status: data.status || 'draft',
      publishAt: data.publishAt,
      hideAfter: data.hideAfter,
      
      // Offline Policy
      offlineAvailable: data.offlineAvailable !== undefined ? data.offlineAvailable === 'true' || data.offlineAvailable === true : true,
      isSecure: data.isSecure !== undefined ? data.isSecure === 'true' || data.isSecure === true : true,

      // Collections
      collectionItemIds: data.collectionItemIds || [],
      
      // Category & Display
      categoryId: data.categoryId,
      displayOrder: data.displayOrder || 99,
      displayGroup: data.displayGroup || 'normal',
      isPinned: data.isPinned || false,
      isFeatured: data.isFeatured || false,

      // Multiple Targets
      courseIds: data.courseIds || [],
      subjectIds: data.subjectIds || [],
      topicIds: data.topicIds || [],
      classIds: data.classIds || [],
      batchIds: data.batchIds || [],
      isGeneral: data.isGeneral || false,
      
      // Access Targets
      targetBatchIds: data.targetBatchIds || [],
      targetStudentIds: data.targetStudentIds || [],
      targetPrograms: data.targetPrograms || [],

      createdBy: userId,
      updatedBy: userId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Clean undefined fields for Firestore
    Object.keys(resourceData).forEach(key => (resourceData as any)[key] === undefined && delete (resourceData as any)[key]);

    const createdResource = await this.repo.create(resourceData, userId);
    generalCache.invalidatePrefix('resources_list_');
    return createdResource;
  }

  async getResource(id: string) {
    const resource = await this.repo.findById(id);
    if (!resource) throw new AppError('Resource not found', 404);
    if (resource.provider === 'google_drive' || resource.provider === 'external_link' || resource.provider === 'firebase_asset') {
      (resource as any).sourceUrl = decrypt(resource.storagePath);
    }
    return resource;
  }

  async listResources(filters: any): Promise<any[]> {
    const cacheKey = `resources_list_${JSON.stringify(filters)}`;
    const cached = generalCache.get<any>(cacheKey);
    if (cached) return cached;

    const list = await this.repo.list(filters);
    
    // Lazy load repositories to avoid circular dependency
    const { CourseRepository, SubjectRepository, TopicRepository, ClassRepository } = require('../courses/repository');
    const courseRepo = new CourseRepository();
    const subjectRepo = new SubjectRepository();
    const topicRepo = new TopicRepository();
    const classRepo = new ClassRepository();

    // Cache to avoid duplicate fetches
    const namesCache: Record<string, string> = {};

    const getName = async (repo: any, id: string) => {
      if (namesCache[id]) return namesCache[id];
      try {
        const doc = await repo.findById(id);
        if (doc) {
          namesCache[id] = doc.name || doc.title;
          return namesCache[id];
        }
      } catch (e) {}
      return 'Unknown';
    };

    // OPTIMIZATION: Pre-fetch all referenced entity names in batch upfront
    const classIdsToFetch = new Set<string>();
    const topicIdsToFetch = new Set<string>();
    const subjectIdsToFetch = new Set<string>();
    const courseIdsToFetch = new Set<string>();

    list.forEach(res => {
      if (res.classIds?.[0]) classIdsToFetch.add(res.classIds[0]);
      if (res.topicIds?.[0]) topicIdsToFetch.add(res.topicIds[0]);
      if (res.subjectIds?.[0]) subjectIdsToFetch.add(res.subjectIds[0]);
      if (res.courseIds?.[0]) courseIdsToFetch.add(res.courseIds[0]);
    });

    const batchFetchNames = async (repo: any, idsSet: Set<string>) => {
      const ids = Array.from(idsSet).filter(id => id && !namesCache[id]);
      if (ids.length === 0) return;
      await Promise.all(ids.map(async id => {
        try {
          const doc = await repo.findById(id);
          if (doc) namesCache[id] = doc.name || doc.title;
        } catch (e) {}
      }));
    };

    await Promise.all([
      batchFetchNames(classRepo, classIdsToFetch),
      batchFetchNames(topicRepo, topicIdsToFetch),
      batchFetchNames(subjectRepo, subjectIdsToFetch),
      batchFetchNames(courseRepo, courseIdsToFetch),
    ]);

    const populatedList = await Promise.all(list.map(async (res) => {
      let finalRes = { ...res };
      if (res.provider === 'google_drive' || res.provider === 'external_link' || res.provider === 'firebase_asset') {
        finalRes.sourceUrl = decrypt(res.storagePath);
      }

      // Build hierarchy path if applicable
      let path = '';
      if (res.classIds && res.classIds.length > 0) {
        const className = await getName(classRepo, res.classIds[0]);
        // To get the full path, we'd need to go up the tree, but for simplicity let's just show the class name or try to fetch others if present.
        // Assuming if it has a class, it probably has the course/subject/topic ids stored too!
        let parts = [];
        if (res.courseIds?.[0]) parts.push(await getName(courseRepo, res.courseIds[0]));
        if (res.subjectIds?.[0]) parts.push(await getName(subjectRepo, res.subjectIds[0]));
        if (res.topicIds?.[0]) parts.push(await getName(topicRepo, res.topicIds[0]));
        parts.push(className);
        path = parts.join(' > ');
      } else if (res.topicIds && res.topicIds.length > 0) {
        let parts = [];
        if (res.courseIds?.[0]) parts.push(await getName(courseRepo, res.courseIds[0]));
        if (res.subjectIds?.[0]) parts.push(await getName(subjectRepo, res.subjectIds[0]));
        parts.push(await getName(topicRepo, res.topicIds[0]));
        path = parts.join(' > ');
      } else if (res.subjectIds && res.subjectIds.length > 0) {
        let parts = [];
        if (res.courseIds?.[0]) parts.push(await getName(courseRepo, res.courseIds[0]));
        parts.push(await getName(subjectRepo, res.subjectIds[0]));
        path = parts.join(' > ');
      } else if (res.courseIds && res.courseIds.length > 0) {
        path = await getName(courseRepo, res.courseIds[0]);
      } else if (res.isGeneral) {
        path = 'Global Resource';
      }

      (finalRes as any).assignedPath = path;

      return finalRes;
    }));

    generalCache.set(cacheKey, populatedList, 600); // Cache for 10 minutes
    return populatedList;
  }

  async deleteResource(id: string) {
    const resource = await this.repo.findById(id);
    if (!resource) throw new AppError('Resource not found', 404);
    
    // FIX (Bug 4): Only attempt Firebase Storage deletion for firebase_storage provider.
    // For google_drive / external_link / firebase_asset, storagePath is a URL — calling
    // storage.bucket().file(url).delete() would always fail with a cryptic error.
    if (resource.provider === 'firebase_storage') {
      try {
        const decryptedPath = decrypt(resource.storagePath);
        await this.getBucket().file(decryptedPath).delete();
      } catch (e) {
        // Log but continue — document must still be soft-deleted even if blob is gone
      }
    }

    await this.repo.delete(id);
    generalCache.invalidatePrefix('resources_list_');
  }

  async getResourceAccess(resourceId: string, user: any, protocol?: string, host?: string) {
    const resource = await this.repo.findById(resourceId);
    if (!resource) throw new AppError('Resource not found', 404);
    
    // Evaluate Access via Shared Engine
    const decryptedPath = decrypt(resource.storagePath);
    
    const access = await AccessEngine.evaluateAccess({
      userId: user.userId,
      tenantId: user.tenantId,
      resourceType: 'resource',
      resourceId,
      storagePath: resource.provider === 'firebase_storage' ? decryptedPath : undefined,
      tokenPayload: {
        resourceType: resource.type,
        mimeType: resource.mimeType,
        checksum: resource.checksum,
        version: resource.version
      },
      visibilityRule: {
        visibility: resource.visibility,
        targetBatchIds: resource.targetBatchIds,
        targetPrograms: resource.targetPrograms,
        targetStudentIds: resource.targetStudentIds
      }
    });

    let viewerUrl = access.signedUrl;
    let viewerType = 'pdf'; // Default to internal PDF viewer for Firebase Storage / generic PDFs

    if (resource.provider === 'google_drive' && decryptedPath) {
      let fileId = decryptedPath;
      if (decryptedPath.startsWith('http')) {
        const match = decryptedPath.match(/[-\w]{25,}/);
        if (match) fileId = match[0];
      }
      viewerUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      viewerType = 'webview';
    } else if (resource.provider === 'firebase_storage' && access.signedUrl) {
      // Use the absolute backend proxy secure-stream path to bypass CORS issues on the client browser.
      const baseUrl = (protocol && host) ? `${protocol}://${host}` : '';
      viewerUrl = `${baseUrl}/api/resources/${resource.id}/secure-stream?token=${access.token}`;
      viewerType = 'pdf';
    } else if (resource.provider === 'external_link' && decryptedPath) {
      viewerUrl = decryptedPath;
      viewerType = 'webview';
    }

    // Log the open event asynchronously
    logResourceOpen(resourceId, user.userId, user.tenantId);

    return {
      // Resource metadata
      resourceId: resource.id,
      title: resource.title,
      contentType: resource.mimeType,
      mimeType: resource.mimeType,      // alias — some clients use mimeType directly
      version: resource.version,
      checksum: resource.checksum,
      offlineAllowed: resource.offlineAvailable !== false,
      isSecure: resource.isSecure !== false,
      provider: resource.provider,
      
      // Access engine fields (contains studentName, expiresAt, etc.)
      ...access,
      
      // Delivery fields
      viewerUrl,
      viewerType,
    };
  }

  private getProvider(providerName: string): IResourceProvider {
    switch (providerName) {
      case 'firebase_storage': return new FirebaseStorageProvider();
      case 'google_drive': return new GoogleDriveProvider();
      default: throw new AppError(`Unsupported provider: ${providerName}`, 400);
    }
  }

  async streamResource(resourceId: string, req: any, res: any) {
    console.log("[STREAM] Request received");
    console.log("[STREAM] Range:", req.headers.range);
    
    const startTime = Date.now();
    const user = req.user;
    
    // Use studentName if available, else fallback to ID
    const studentName = user.studentName || user.userId;
    const logger = new StreamLogger(resourceId, user.userId, studentName);
    
    const resource = await this.repo.findById(resourceId);
    if (!resource) throw new AppError('Resource not found', 404);
    
    logger.recordTiming('Lookup', Date.now() - startTime);
    const timeAfterLookup = Date.now();

    
    // Validate access (this will throw if not allowed)
    const decryptedPath = decrypt(resource.storagePath);
    await AccessEngine.evaluateAccess({
      userId: user.userId,
      tenantId: user.tenantId,
      resourceType: 'resource',
      resourceId,
      storagePath: resource.provider === 'firebase_storage' ? decryptedPath : undefined,
      visibilityRule: {
        visibility: resource.visibility,
        targetBatchIds: resource.targetBatchIds,
        targetPrograms: resource.targetPrograms,
        targetStudentIds: resource.targetStudentIds
      }
    });

    logger.recordTiming('Permission', Date.now() - timeAfterLookup);

    const provider = this.getProvider(resource.provider);
    const rangeHeader = req.headers.range;
    
    let streamOptions: any = {};
    const fileSize = resource.fileSize;
    let start = 0;
    let end = fileSize - 1;

    if (rangeHeader && fileSize) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      streamOptions = { start, end };
    }

    const timeBeforeStream = Date.now();

    let streamResult;
    try {
      streamResult = await provider.getStream(resource, streamOptions);
    } catch (err: any) {
      logger.recordTiming('ProviderError', Date.now() - timeBeforeStream);
      throw err; // Bubbles up to Express errorHandler safely, NO headers sent yet
    }

    const { stream } = streamResult;

    if (rangeHeader && fileSize) {
      logger.setProviderInfo(resource.provider, fileSize, resource.mimeType, resource.version, resource.checksum, rangeHeader);
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start) + 1,
        'Content-Type': resource.mimeType,
        'ETag': `"${resource.checksum}"`,
        'Last-Modified': new Date(resource.updatedAt).toUTCString()
      });
    } else {
      logger.setProviderInfo(resource.provider, fileSize, resource.mimeType, resource.version, resource.checksum);
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': resource.mimeType,
        'Accept-Ranges': 'bytes',
        'ETag': `"${resource.checksum}"`,
        'Last-Modified': new Date(resource.updatedAt).toUTCString()
      });
    }

    const timeAfterStreamReq = Date.now();
    let firstChunkLogged = false;
    let lastChunkTime = timeAfterStreamReq;

    stream.on('data', (chunk) => {
      if (!firstChunkLogged) {
        firstChunkLogged = true;
        logger.recordTiming('FirstByte', Date.now() - timeAfterStreamReq);
        console.log(`
========== STREAM ==========
JWT Verified
YES
Permission
PASS
Provider
${resource.provider}
Stream Opened
YES
First Byte Sent
YES
==============================`);
      }
      const now = Date.now();
      logger.recordChunk(chunk.length, now - lastChunkTime);
      lastChunkTime = now;
    });
    
    stream.on('end', () => {
      logger.complete();
    });

    stream.pipe(res);
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
  }

  async getCourseHierarchyResources(courseId: string, tenantId: string) {
    // We fetch all resources for the tenant, then group them in memory.
    // This minimizes Firestore reads for LMS platforms since resources per tenant are typically < 10,000.
    const allResources = await this.repo.list({ tenantId });
    
    // We also need the course syllabus tree to know which subjects/topics/classes belong to this course.
    const { CourseService } = require('../courses/service'); // Lazy load to avoid circular dependency
    const courseService = new CourseService();
    
    // Fetch course syllabus
    const subjects = await courseService.listSubjectsByCourse(courseId, tenantId);
    const subjectIds = new Set(subjects.map((s: any) => s.id));
    
    const topicIds = new Set<string>();
    const classIds = new Set<string>();
    
    await Promise.all(subjects.map(async (subj: any) => {
      const topics = await courseService.listTopicsBySubject(subj.id, tenantId);
      topics.forEach((t: any) => {
        topicIds.add(t.id);
      });
      
      await Promise.all(topics.map(async (topic: any) => {
        const classes = await courseService.listClassesByTopic(topic.id, tenantId);
        classes.forEach((c: any) => classIds.add(c.id));
      }));
    }));

    const classResources: any[] = [];
    const topicResources: any[] = [];
    const subjectResources: any[] = [];
    const courseResources: any[] = [];
    const generalResources: any[] = [];

    const addedResourceIds = new Set<string>();

    // We process in priority order: Class -> Topic -> Subject -> Course -> General
    
    // 1. Class
    allResources.forEach(res => {
      if (res.classIds?.some(id => classIds.has(id)) && !addedResourceIds.has(res.id!)) {
        classResources.push(this.sanitizeForHierarchy(res));
        addedResourceIds.add(res.id!);
      }
    });

    // 2. Topic
    allResources.forEach(res => {
      if (res.topicIds?.some(id => topicIds.has(id)) && !addedResourceIds.has(res.id!)) {
        topicResources.push(this.sanitizeForHierarchy(res));
        addedResourceIds.add(res.id!);
      }
    });

    // 3. Subject
    allResources.forEach(res => {
      if (res.subjectIds?.some(id => subjectIds.has(id)) && !addedResourceIds.has(res.id!)) {
        subjectResources.push(this.sanitizeForHierarchy(res));
        addedResourceIds.add(res.id!);
      }
    });

    // 4. Course
    allResources.forEach(res => {
      if (res.courseIds?.includes(courseId) && !addedResourceIds.has(res.id!)) {
        courseResources.push(this.sanitizeForHierarchy(res));
        addedResourceIds.add(res.id!);
      }
    });

    // 5. General
    allResources.forEach(res => {
      if (res.isGeneral && !addedResourceIds.has(res.id!)) {
        generalResources.push(this.sanitizeForHierarchy(res));
        addedResourceIds.add(res.id!);
      }
    });

    return {
      groups: [
        { title: 'General Resources', count: generalResources.length, expanded: generalResources.length > 0, resources: generalResources },
        { title: 'Course Resources', count: courseResources.length, expanded: courseResources.length > 0, resources: courseResources },
        { title: 'Subject Resources', count: subjectResources.length, expanded: subjectResources.length > 0, resources: subjectResources },
        { title: 'Topic Resources', count: topicResources.length, expanded: topicResources.length > 0, resources: topicResources },
        { title: 'Class Resources', count: classResources.length, expanded: classResources.length > 0, resources: classResources },
      ]
    };
  }

  // Strip sensitive fields (like signedUrl, checksum) for the hierarchy endpoint to optimize bandwidth
  private sanitizeForHierarchy(res: IResource) {
    const { storagePath, checksum, ...safeMetadata } = res;
    return safeMetadata;
  }

  async updateResource(resourceId: string, data: any, userId: string) {
    const existing = await this.repo.findById(resourceId);
    if (!existing) throw new AppError('Resource not found', 404);

    const updateData: Partial<IResource> = {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      displayOrder: data.displayOrder,
      displayGroup: data.displayGroup,
      isPinned: data.isPinned,
      isFeatured: data.isFeatured,
      courseIds: data.courseIds,
      subjectIds: data.subjectIds,
      topicIds: data.topicIds,
      classIds: data.classIds,
      batchIds: data.batchIds,
      isGeneral: data.isGeneral,
      visibility: data.visibility,
      targetBatchIds: data.targetBatchIds,
      targetPrograms: data.targetPrograms,
      targetStudentIds: data.targetStudentIds,
      
      // Extended Metadata
      author: data.author,
      language: data.language,
      readingTimeMins: data.readingTimeMins ? parseInt(data.readingTimeMins) : undefined,
      publishedDate: data.publishedDate,
      status: data.status,
      publishAt: data.publishAt,
      hideAfter: data.hideAfter,
      offlineAvailable: data.offlineAvailable !== undefined ? data.offlineAvailable === 'true' || data.offlineAvailable === true : undefined,
      isSecure: data.isSecure !== undefined ? data.isSecure === 'true' || data.isSecure === true : undefined,
      collectionItemIds: data.collectionItemIds,
      tags: data.tags,
      thumbnail: data.thumbnail,

      updatedBy: userId,
      updatedAt: new Date().toISOString()
    };

    // Clean undefined fields
    Object.keys(updateData).forEach(key => updateData[key as keyof IResource] === undefined && delete updateData[key as keyof IResource]);

    await this.repo.update(resourceId, updateData, userId);
    generalCache.invalidatePrefix('resources_list_');
    return { ...existing, ...updateData };
  }

  async uploadNewVersion(resourceId: string, file: any, userId: string, tenantId: string) {
    const existing = await this.repo.findById(resourceId);
    if (!existing) throw new AppError('Resource not found', 404);
    if (!file) throw new AppError('No file provided for new version', 400);

    const fileSize = file.size;
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    let newStoragePath = '';
    let newProvider = existing.provider;

    // Try Google Drive first
    let driveSuccess = false;
    try {
      const driveResult = await uploadFileToGoogleDrive({
        fileName: `${Date.now()}_${file.originalname}`,
        mimeType: file.mimetype,
        buffer: file.buffer,
        subPath: 'LMS/Resources'
      });
      if (driveResult && driveResult.previewUrl) {
        newStoragePath = driveResult.previewUrl;
        newProvider = 'google_drive';
        driveSuccess = true;
        console.log(`[Drive] Resource version uploaded: ${driveResult.previewUrl}`);
      }
    } catch (driveErr: any) {
      console.warn('[Drive] Version upload failed, falling back to Firebase Storage:', driveErr?.message);
    }

    // Fallback: Firebase Storage
    if (!driveSuccess) {
      const bucket = this.getBucket();
      const destPath = `resources/${tenantId}/${Date.now()}_${file.originalname}`;
      const bucketFile = bucket.file(destPath);
      await bucketFile.save(file.buffer, {
        metadata: { contentType: file.mimetype }
      });
      newStoragePath = destPath;
      newProvider = 'firebase_storage';
    }

    const updateData: Partial<IResource> = {
      storagePath: encrypt(newStoragePath),
      provider: newProvider as any,
      checksum,
      fileSize,
      mimeType: file.mimetype,
      version: existing.version + 1,
      previousVersion: existing.version,
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    };

    await this.repo.update(resourceId, updateData, userId);
    generalCache.invalidatePrefix('resources_list_');
    
    // Attempt to delete old file only if it was in Firebase Storage
    if (existing.provider === 'firebase_storage') {
      try {
        const oldPath = decrypt(existing.storagePath);
        await this.getBucket().file(oldPath).delete();
      } catch(e) {}
    }

    return { ...existing, ...updateData };
  }
}

