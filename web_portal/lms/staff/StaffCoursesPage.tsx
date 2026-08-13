import React, { useState, useEffect } from 'react';
import { Book, Users, Calendar, ArrowRight } from 'lucide-react';
import api from '../core/api';

interface AssignedCourse {
  id: string;
  name: string;
  role: string;
  assignedBy: string;
  assignedAt: string;
}

export const StaffCoursesPage = () => {
  const [courses, setCourses] = useState<AssignedCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get('/staff/me/courses');
        setCourses(response.data.data || []);
      } catch (error) {
        console.error('Failed to fetch assigned courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">My Assigned Courses</h1>
        <p className="text-white/60">Courses that you have been assigned to teach or manage.</p>
      </div>

      {courses.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-12 text-center">
          <Book className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Courses Assigned</h3>
          <p className="text-white/50">You have not been assigned to any courses yet. Please contact an administrator.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-gradient-to-br from-[#8B0000] to-[#B22222] rounded-xl text-white shadow-lg shadow-red-900/20">
                    <Book className="w-5 h-5" />
                  </div>
                  <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-[#D4AF37] tracking-wider uppercase">
                    {course.role}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#D4AF37] transition-colors">{course.name}</h3>
                
                <div className="space-y-2 mt-6">
                  <div className="flex items-center text-sm text-white/50">
                    <Users className="w-4 h-4 mr-2" />
                    Assigned by: <span className="text-white/80 ml-1">{course.assignedBy}</span>
                  </div>
                  {course.assignedAt && (
                    <div className="flex items-center text-sm text-white/50">
                      <Calendar className="w-4 h-4 mr-2" />
                      Date: <span className="text-white/80 ml-1">{new Date(course.assignedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


