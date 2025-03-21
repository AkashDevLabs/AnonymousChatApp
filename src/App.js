import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("https://anonymouschatapp-j1fu.onrender.com");

function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [matchedUser, setMatchedUser] = useState("");
  const [interests, setInterests] = useState("");

  useEffect(() => {
    socket.on("assign-name", (name) => {
      setName(name);
    });

    socket.on("match", (matchedName) => {
      setMatchedUser(matchedName);
    });

    socket.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("end-chat", () => {
      setMatchedUser("");
      setMessages([]);
    });
  }, []);

  const handleJoin = () => {
    socket.emit("join", interests);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit("message", message);
      setMessage("");
    }
  };

  return (
    <div>
      <h1>Anonymous Chat</h1>
      <p>Your Name: {name}</p>
      {!matchedUser ? (
        <div>
          <input
            type="text"
            placeholder="Enter interests (optional)"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
          <button onClick={handleJoin}>Start Chatting</button>
        </div>
      ) : (
        <div>
          <h2>Chatting with: {matchedUser}</h2>
          <div>
            {messages.map((msg, index) => (
              <p key={index}>
                <strong>{msg.sender}:</strong> {msg.message}
              </p>
            ))}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      )}
    </div>
  );
}

export default App;