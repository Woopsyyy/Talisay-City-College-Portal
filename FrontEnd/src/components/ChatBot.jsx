import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { StudentAPI, PublicAPI } from "../services/api";
import "./ChatBot.css";

const ChatBot = () => {
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "👋 Hello! I'm your TCC Assistant.\n\nYou can ask about:\n• Toggle dark/light mode\n• Current date and time\n• Building count\n\nLog in to access your personal information (grades, sanctions, section, and profile).",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userCache, setUserCache] = useState(null);
  const [memory, setMemory] = useState([]);
  const messagesEndRef = useRef(null);
  const { theme, setMode } = useTheme();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && currentUser && !userCache) {
      fetchUserData();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    const key = currentUser
      ? `tcc_chat_memory_${currentUser.id}`
      : "tcc_chat_memory_public";
    try {
      const stored = localStorage.getItem(key);
      setMemory(stored ? JSON.parse(stored) : []);
    } catch {
      setMemory([]);
    }
  }, [currentUser]);

  const persistMemory = (nextMemory) => {
    const key = currentUser
      ? `tcc_chat_memory_${currentUser.id}`
      : "tcc_chat_memory_public";
    setMemory(nextMemory);
    try {
      localStorage.setItem(key, JSON.stringify(nextMemory.slice(-50)));
    } catch {
      // ignore storage errors
    }
  };

  const fetchUserData = async () => {
    try {
      if (currentUser) {
        let assignment = null;
        if (currentUser.role === "student") {
          assignment = await StudentAPI.getAssignment();
        }
        setUserCache({
          user: currentUser,
          assignment: assignment,
        });
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const responseText = await processQuery(input);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: responseText },
        ]);
        setIsTyping(false);
      }, 600);

      if (responseText && responseText.length < 500) {
        const nextMemory = [...memory, { q: input, a: responseText }];
        persistMemory(nextMemory);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content:
            "⚠️ I encountered an error processing your request. Please try again.",
        },
      ]);
      setIsTyping(false);
    }
  };

  const processQuery = async (query) => {
    const q = query.toLowerCase();

    const otherUserIndicators = [
      "his ",
      "her ",
      "their ",
      "someone",
      "student ",
      "user ",
      "john",
      "mary",
      "other",
      "classmate",
      "friend",
    ];

    const isAskingAboutOthers = otherUserIndicators.some((indicator) =>
      q.includes(indicator),
    );
    const isAskingAboutSelf =
      q.includes("my ") ||
      q.includes("i ") ||
      q.includes("am i") ||
      q.includes("do i") ||
      q.includes("can i");

    if (isAskingAboutOthers && !isAskingAboutSelf) {
      return "🔒 I can only provide information about YOUR account for privacy and security reasons. Please ask about your own information using 'my' or 'I'.";
    }

    const personalQueryKeywords = [
      "sanction",
      "grade",
      "schedule",
      "enrollment",
      "section",
      "class",
      "violation",
      "info",
      "name",
      "email",
      "profile",
    ];
    if (personalQueryKeywords.some((keyword) => q.includes(keyword))) {
      if (!currentUser) {
        return "🔐 Please log in to access your personal information.";
      }
    }

    if (q.includes("dark") && (q.includes("mode") || q.includes("theme"))) {
      setMode("dark");
      return "🌙 Dark mode activated! Your eyes will thank you.";
    }
    if (q.includes("light") && (q.includes("mode") || q.includes("theme"))) {
      setMode("light");
      return "☀️ Light mode activated! Let there be light!";
    }
    if (q.includes("toggle") && (q.includes("theme") || q.includes("mode"))) {
      const nextMode = theme === "dark" ? "light" : "dark";
      setMode(nextMode);
      return nextMode === "dark"
        ? "🌙 Dark mode activated!"
        : "☀️ Light mode activated!";
    }

    const learned = findLearnedResponse(q);
    if (learned) {
      return learned;
    }

    if (!currentUser) {
      if (q.includes("building")) {
        try {
          const stats = await PublicAPI.getStats();
          return `🏢 There are currently **${stats.buildings || 0}** campus buildings.`;
        } catch {
          return "🏢 I couldn't retrieve the building count right now.";
        }
      }
    }

    if (
      q.includes("sanction") ||
      q.includes("violation") ||
      q.includes("offense") ||
      q.includes("discipline")
    ) {
      if (currentUser?.role !== "student")
        return "ℹ️ Sanction lookup is only available for students.";
      try {
        const assignment =
          userCache?.assignment || (await StudentAPI.getAssignment());

        if (assignment && assignment.sanctions) {
          return `⚠️ **Sanction Record Found**\n\n📋 **Reason:** ${
            assignment.sanction_reason || "Not specified"
          }\n\n⏰ **Date:** ${
            assignment.sanction_date
              ? new Date(assignment.sanction_date).toLocaleDateString()
              : "N/A"
          }\n\n🏢 Please visit the OSAS office to resolve this matter.`;
        } else {
          return "✅ Good news! You have no active sanctions on your record. Keep up the good behavior!";
        }
      } catch (err) {
        return "❌ I couldn't retrieve your sanction records.";
      }
    }

    if (q.includes("grade") || q.includes("gpa") || q.includes("academic")) {
      return "📊 You can view your grades and academic performance in the **My Grades** section of your dashboard.";
    }

    if (
      q.includes("schedule") ||
      q.includes("class") ||
      q.includes("subject") ||
      q.includes("timetable")
    ) {
      if (currentUser?.role !== "student")
        return "ℹ️ Detailed schedule bot lookup is tailored for students. Please check your teacher/admin dashboard.";
      try {
        const assignment =
          userCache?.assignment || (await StudentAPI.getAssignment());

        if (assignment && assignment.section) {
          return `📅 **Your Class Information**\n\n🏫 **Section:** ${
            assignment.section
          }\n\nFor detailed schedules, please check your student dashboard.`;
        } else {
          return "📅 You don't appear to be assigned to a section yet.";
        }
      } catch (err) {
        return "❌ I couldn't retrieve your class schedule.";
      }
    }

    if (
      q.includes("my name") ||
      q.includes("my email") ||
      q.includes("my info") ||
      q.includes("who am i") ||
      q.includes("profile")
    ) {
      if (!currentUser) return "🔐 Please log in first.";
      return `👤 **Your Profile Information**\n\n📧 **Email:** ${currentUser.email || "Not available"}\n🆔 **User ID:** ${currentUser.school_id || currentUser.id}\n👥 **Role:** ${currentUser.role}`;
    }

    if (
      q.includes("time") ||
      q.includes("date") ||
      q.includes("today") ||
      q.includes("now")
    ) {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const timeStr = now.toLocaleTimeString("en-US");
      return `🕐 **Current Date & Time**\n\n📅 ${dateStr}\n⏰ ${timeStr}`;
    }

    if (
      q.includes("help") ||
      q.includes("what can you") ||
      q.includes("assist") ||
      q.includes("how do") ||
      q.uncludes("tabang") ||
      q.uncludes("tabang yawa")
    ) {
      if (!currentUser) {
        return "🤖 **I can help you with:**\n\n✓ Toggle dark/light mode\n✓ Current date and time\n✓ Building count\n\nLog in to access your personal information.";
      }
      return "🤖 **I can help you with:**\n\n✓ Check your sanctions/violations\n✓ View your enrollment status\n✓ Check your section and class info\n✓ Access your profile information\n✓ Get current date and time\n✓ Toggle dark/light mode";
    }

    if (
      q.includes("hello") ||
      q.includes("hi ") ||
      q === "hi" ||
      q.includes("hey")
    ) {
      return "👋 Hello! How can I assist you today?";
    }

    if (q.includes("bye") || q.includes("goodbye") || q.includes("see you")) {
      return "👋 Goodbye! Have a great day!";
    }

    if (q.includes("thank") || q.includes("thanks")) {
      return "😊 You're welcome!";
    }

    return "🤔 I'm not sure I understand. Try asking about your sanctions, grades, or schedule. Or type 'help'!";
  };

  const findLearnedResponse = (q) => {
    if (!memory || memory.length === 0) return null;
    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;
    let best = { score: 0, response: null };
    for (const item of memory) {
      const ref = (item.q || "").toLowerCase();
      const refTokens = ref.split(/\s+/).filter(Boolean);
      if (refTokens.length === 0) continue;
      const overlap = tokens.filter((t) => refTokens.includes(t)).length;
      const score = overlap / Math.max(tokens.length, refTokens.length);
      if (score > best.score) best = { score, response: item.a };
    }
    return best.score >= 0.6 ? best.response : null;
  };

  const quickActions = currentUser
    ? [
        { label: "My Sanctions", query: "Do I have any sanctions?" },
        { label: "My Section", query: "What is my section?" },
        { label: "Toggle Theme", query: "Toggle dark mode" },
        { label: "Help", query: "What can you help me with?" },
      ]
    : [
        { label: "Buildings", query: "How many buildings?" },
        { label: "Toggle Theme", query: "Toggle dark mode" },
        { label: "Date & Time", query: "What time is it now?" },
        { label: "Help", query: "What can you help me with?" },
      ];

  const handleQuickAction = (query) => {
    setInput(query);
  };

  return (
    <div className="chatbot-container">
      {isOpen && (
        <div className="chatbot-window card">
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="status-dot"></div>
              <div className="chatbot-header-info">
                <h3>🎓 TCC Assistant</h3>
                <p>Online • Ready to help</p>
              </div>
            </div>
            <button
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-content">
                  {msg.content.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < msg.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message bot typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="chatbot-quick-actions">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="quick-action-btn"
                  onClick={() => handleQuickAction(action.query)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <form className="chatbot-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" disabled={!input.trim() || isTyping}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        className="chatbot-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <X size={28} /> : <Sparkles size={28} />}
        {!isOpen && <span className="chatbot-badge">AI</span>}
      </button>
    </div>
  );
};

export default ChatBot;
