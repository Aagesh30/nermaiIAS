const fs = require('fs');

console.log("Adding missing prompt helper state variables to web_portal/App.tsx...");

const webPath = 'web_portal/App.tsx';

let content = fs.readFileSync(webPath, 'utf8');
content = content.replace(/\r\n/g, '\n');

const targetStr = `  const [genMode, setGenMode] = useState<"file"|"text"|"json">("file");
  const [jsonQuestionsInput, setJsonQuestionsInput] = useState("");`;

const replacementStr = `  const [genMode, setGenMode] = useState<"file"|"text"|"json">("file");
  const [jsonQuestionsInput, setJsonQuestionsInput] = useState("");
  const [showAiPromptHelper, setShowAiPromptHelper] = useState(false);
  const [promptNumQs, setPromptNumQs] = useState("50");
  const [promptTopic, setPromptTopic] = useState("");
  const [selectedPromptType, setSelectedPromptType] = useState("en-ta");`;

if (content.indexOf(targetStr) === -1) {
  console.error("ERROR: targetStr not found!");
  process.exit(1);
}
content = content.split(targetStr).join(replacementStr);
console.log("- Successfully added prompt helper state variables.");

fs.writeFileSync(webPath, content, 'utf8');
console.log("States fixed!");
