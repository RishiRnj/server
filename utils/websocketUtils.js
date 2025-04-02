// // utils/websocketUtils.js

const WebSocket = require('ws');


// Broadcast Function
const broadcast = (wss, data, eventType, recipients = []) => {
    const message = JSON.stringify({ eventType, data });
     wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // If recipients are provided, check if the client is among them
        if (!recipients.length || recipients.includes(client.userId)) {
          client.send(message);
        }
      }
    });
  };
  

module.exports = { broadcast };
