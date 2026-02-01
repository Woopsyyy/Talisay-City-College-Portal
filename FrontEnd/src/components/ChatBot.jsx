import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { AuthAPI, StudentAPI } from "../services/api";
import "./ChatBot.css";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "👋 Hello! I'm your TCC Assistant. I can help you with:\n\n• Your sanctions and violations\n• Your enrollment status\n• Your grades and academic info\n• Your class schedule\n• Your personal information\n• Toggle dark/light mode\n• Current date and time\n\nWhat would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userCache, setUserCache] = useState(null);
  const messagesEndRef = useRef(null);
  const { theme, setMode } = useTheme();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && !userCache) {
      fetchUserData();
    }
  }, [isOpen]);

  const fetchUserData = async () => {
    try {
      const session = await AuthAPI.checkSession();
      if (session && session.user) {
        const assignment = await StudentAPI.getAssignment();
        setUserCache({
          user: session.user,
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
         setMessages((prev) => [...prev, { role: "bot", content: responseText }]);
         setIsTyping(false);
      }, 600);
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
      q.includes(indicator)
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
    ];
    if (personalQueryKeywords.some((keyword) => q.includes(keyword))) {
      if (!userCache) {
        try {
          await fetchUserData();
        } catch {
          return "🔐 Please log in to access your personal information.";
        }
      }

      if (!userCache || !userCache.user) {
        return "🔐 You need to be logged in to access this information. Please log in first.";
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

    
    if (
      q.includes("sanction") ||
      q.includes("violation") ||
      q.includes("offense") ||
      q.includes("discipline")
    ) {
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
        return "❌ I couldn't retrieve your sanction records. You might not be assigned to a section yet, or there was a connection issue.";
      }
    }

    
    if (q.includes("grade") || q.includes("gpa") || q.includes("academic")) {
      return "📊 You can view your grades and academic performance in the **My Grades** section of your dashboard.\n\nIf you need specific grade information, please visit your student portal.";
    }

    
    if (
      q.includes("schedule") ||
      q.includes("class") ||
      q.includes("subject") ||
      q.includes("timetable")
    ) {
      try {
        const assignment =
          userCache?.assignment || (await StudentAPI.getAssignment());

        if (assignment && assignment.section) {
          return `📅 **Your Class Information**\n\n🏫 **Section:** ${
            assignment.section.section_name
          }\n📚 **Year Level:** ${
            assignment.section.year_level || "N/A"
          }\n\nFor detailed schedules, please check your student dashboard.`;
        } else {
          return "📅 You don't appear to be assigned to a section yet. Please contact the registrar's office.";
        }
      } catch (err) {
        return "❌ I couldn't retrieve your class schedule. Please try again or contact support.";
      }
    }

    
    if (
      q.includes("enroll") ||
      q.includes("admission") ||
      q.includes("register")
    ) {
      try {
        const assignment =
          userCache?.assignment || (await StudentAPI.getAssignment());

        if (assignment) {
          return `✅ **Enrollment Status: Active**\n\n🏫 You are currently enrolled in:\n• **Section:** ${
            assignment.section?.section_name || "N/A"
          }\n• **Year Level:** ${
            assignment.section?.year_level || "N/A"
          }\n\nFor enrollment concerns, visit the Admissions Office.`;
        } else {
          return "⚠️ You don't appear to be enrolled in any section yet. Please visit the Admissions Office for enrollment assistance.";
        }
      } catch (err) {
        return "❌ I couldn't verify your enrollment status. Please contact the registrar.";
      }
    }

    
    if (
      q.includes("my name") ||
      q.includes("my email") ||
      q.includes("my info") ||
      q.includes("who am i") ||
      q.includes("profile")
    ) {
      try {
        const user = userCache?.user || (await AuthAPI.checkSession()).user;

        if (user) {
          return `👤 **Your Profile Information**\n\n📧 **Email:** ${user.email}\n🆔 **User ID:** ${user.id}\n👥 **Role:** ${user.role}\n\nTo update your information, please visit your profile settings.`;
        }
      } catch (err) {
        return "❌ I couldn't retrieve your profile information.";
      }
    }

    
    if (
      q.includes("section") ||
      q.includes("classmates") ||
      q.includes("my class")
    ) {
      try {
        const assignment =
          userCache?.assignment || (await StudentAPI.getAssignment());

        if (assignment && assignment.section) {
          return `🏫 **Your Section Details**\n\n📚 **Section Name:** ${
            assignment.section.section_name
          }\n📊 **Year Level:** ${
            assignment.section.year_level || "N/A"
          }\n👥 **Adviser:** ${
            assignment.section.adviser_name || "Not assigned"
          }\n\nFor classmate information, please check your section roster in the dashboard.`;
        } else {
          return "📚 You are not currently assigned to any section. Please contact your registrar.";
        }
      } catch (err) {
        return "❌ I couldn't retrieve your section information.";
      }
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
      q.includes("how do")
    ) {
      return "🤖 **I can help you with:**\n\n✓ Check your sanctions/violations\n✓ View your enrollment status\n✓ Check your section and class info\n✓ Access your profile information\n✓ Get current date and time\n✓ Toggle dark/light mode\n\n💡 Just ask me naturally! For example: 'Do I have any sanctions?' or 'What's my section?'";
    }

    
    if (
      q.includes("hello") ||
      q.includes("hi ") ||
      q === "hi" ||
      q.includes("hey")
    ) {
      return "👋 Hello! How can I assist you today? Feel free to ask about your sanctions, grades, schedule, or any student-related information!";
    }

    
    if (q.includes("bye") || q.includes("goodbye") || q.includes("see you")) {
      return "👋 Goodbye! Feel free to reach out anytime you need assistance. Have a great day!";
    }

    
    if (q.includes("thank") || q.includes("thanks")) {
      return "😊 You're welcome! I'm always here to help. Is there anything else you'd like to know?";
    }

    
    return "🤔 I'm not sure I understand that question. Try asking about:\n\n• Your sanctions\n• Your grades\n• Your schedule\n• Your enrollment\n• Dark/light mode\n\nOr type 'help' to see what I can do!";
  };

  const quickActions = [
    { label: "My Sanctions", query: "Do I have any sanctions?" },
    { label: "My Section", query: "What is my section?" },
    { label: "Toggle Theme", query: "Toggle dark mode" },
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
