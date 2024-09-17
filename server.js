const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const twilio = require('twilio');

let conversationId = 'DF4o76r7jwmF8mpcQf25r1-us';
const directLineToken = 'A-oSxjR5Ll4.DXNUlIYP2kLrho6gdqg3f-cC-lHvUafbjPy4PoINaTE';  // Use the Direct Line Token you have
const accountSid = 'ACb1bb9c97453b06f952e5051c43d69f5b';
const authToken = 'aca231c82d9a2c7ca1e93a8849dfea81';
const client = twilio(accountSid, authToken);


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
    console.log("sending message to the bot")
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
    console.log("gettting message from the bot converstation id : ", conversationId)
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

async function checkConversationStatus(conversationId, directLineToken) {
    const url = `https://directline.botframework.com/v3/directline/conversations/${conversationId}/activities`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${directLineToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'message',
            from: { id: 'user1' },
            text: 'Test message to check conversation status'
        })
    });

    if (response.ok) {
        console.log('Conversation is still active.');
        return false
    } else {
        const errorData = await response.json();
        console.error('Conversation is no longer active. Error:', errorData);
        return true
    }
}

// Example usage with a conversation ID and Direct Line token


// Webhook to handle incoming WhatsApp messages via Twilio
app.post('/whatsapp', async (req, res) => {
    const incomingMessage = req.body.Body;  // Message sent by the user via WhatsApp
    const userNumber = req.body.From;       // WhatsApp user's number

    let conversationIdNew = null

    if (checkConversationStatus(conversationId, directLineToken)) {
        conversationIdNew = conversationId
    } else {
        conversationIdNew = await startConversation();
    }

    // Send the user's WhatsApp message to the bot
    await sendMessage(conversationIdNew, incomingMessage);

    // Poll for the bot's response
    setTimeout(async () => {
        const activities = await getBotResponses(conversationIdNew);
        console.log("activities", activities);
        const botResponses = activities.filter(activity => activity.from.id !== 'whatsapp_user'); // Filter out user messages
        console.log("botResponse", botResponses);
        if (botResponses.length > 0) {
            let botReply = botResponses[botResponses.length - 1]
            if (botReply?.text) {
                botReply = botReply?.text
            } else if (botReply?.attachments) {
                botReply = botReply?.attachments?.[0]?.content?.body?.[1]?.text
            } else {
                botReply = "No response found"
            }
            // Send the bot's reply back to the user on WhatsApp
            console.log("botReply : ", botReply)
            client.messages.create({
                from: 'whatsapp:+14155238886', // Twilio sandbox or approved WhatsApp number
                to: userNumber,                // User's WhatsApp number
                body: botReply
            }).then(message => console.log(`Message sent with SID: ${message.sid}`));
        }
    }, 2000); // Poll after 2 seconds to allow bot processing

    res.sendStatus(200);  // Respond to Twilio to acknowledge receipt
});


app.get('/', (req, res) => {
    res.sendStatus(200);
})
// Start the Express server on port 3000
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});