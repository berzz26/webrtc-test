const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3000 });
const clients = {}; // Store connected clients

wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        const data = JSON.parse(message);

        if (data.type === "register") {
            clients[data.name] = ws;
            console.log(`${data.name} connected.`);
        } else if (data.to && clients[data.to]) {
            clients[data.to].send(JSON.stringify(data));
        }
    });

    ws.on("close", () => {
        Object.keys(clients).forEach((name) => {
            if (clients[name] === ws) {
                console.log(`${name} disconnected.`);
                delete clients[name];
            }
        });
    });
});

console.log("WebSocket server running on ws://localhost:3000");
