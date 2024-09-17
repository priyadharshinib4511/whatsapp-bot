const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const twilio = require('twilio');

// Twilio credentials
// const accountSid = 'your_twilio_account_sid';
// const authToken = 'your_twilio_auth_token';
const accountSid = 'ACb1bb9c97453b06f952e5051c43d69f5b';
const authToken = 'aca231c82d9a2c7ca1e93a8849dfea81';
const client = twilio(accountSid, authToken);

// Direct Line Token for Microsoft Bot
const directLineToken = 'A-oSxjR5Ll4.DXNUlIYP2kLrho6gdqg3f-cC-lHvUafbjPy4PoINaTE';  // Use the Direct Line Token you have

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Start a conversation with the bot using the Direct Line API
async function startConversation() {
    const response = await fetch('https://directline.botframework.com/v3/directline/conversations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${directLineToken}`,
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    return data.conversationId;
}

// Send a message to the bot
async function sendMessage(conversationId, messageText) {
    const response = await fetch(`https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${directLineToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'message',
            from: { id: 'whatsapp_user' }, // Identifier for the WhatsApp user
            text: messageText,
        }),
    });
    const data = await response.json();
    return data;
}

// Poll bot responses after sending the message
async function getBotResponses(conversationId) {
    const response = await fetch(`https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${directLineToken}`,
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    return data.activities;
}

// Webhook to handle incoming WhatsApp messages via Twilio
app.post('/whatsapp', async (req, res) => {
    console.log("sample 3",req.body);
    const incomingMessage = req.body.Body;  // Message sent by the user via WhatsApp
    const userNumber = req.body.From;       // WhatsApp user's number

    // Start a conversation with the bot
    const conversationId = await startConversation();

    // Send the user's WhatsApp message to the bot
    await sendMessage(conversationId, incomingMessage);

    // Poll for the bot's response
    setTimeout(async () => {
        const activities = await getBotResponses(conversationId);
        console.log("sample 1",activities);
        const botResponses = activities.filter(activity => activity.from.id !== 'whatsapp_user'); // Filter out user messages
        console.log("sample 2",botResponses);

        if (botResponses.length > 0) {
            const botReply = botResponses[botResponses.length - 1].text;  // Get the last bot response

            // Send the bot's reply back to the user on WhatsApp
            client.messages.create({
                from: 'whatsapp:+14155238886', // Twilio sandbox or approved WhatsApp number
                to: userNumber,                // User's WhatsApp number
                body: botReply
            }).then(message => console.log(`Message sent with SID: ${message.sid}`));
        }
    }, 2000); // Poll after 2 seconds to allow bot processing

    res.sendStatus(200);  // Respond to Twilio to acknowledge receipt
});

// Start the Express server on port 3000
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
