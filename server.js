const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const twilio = require('twilio');

let conversationId = 'Cvq1aNhKIFl1VGeNqae2VY-in';
const directLineToken = 'QqCmcC1BYAM.DW5PbBsQorF2JmQXXJOyrJgskQ56lOYIN1xf2QhA2nI';  // Use the Direct Line Token you have
const accountSid = 'ACb1bb9c97453b06f952e5051c43d69f5b';
const authToken = 'aca231c82d9a2c7ca1e93a8849dfea81';
const client = twilio(accountSid, authToken);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Start a conversation with the bot using the Direct Line API
async function startConversation() {
    console.log("conversation starting")
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
    console.log("getting message from the bot converstation id : ", conversationId)
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
            from: { id: 'whatsapp_user' },
            text: 'Test message to check conversation status'
        })
    });

    if (response.ok) {
        console.log('Conversation is still active.');
        return true
    } else {
        const errorData = await response.json();
        console.error('Conversation is no longer active. Error:', errorData);
        return false
    }
}

// Example usage with a conversation ID and Direct Line token


// Webhook to handle incoming WhatsApp messages via Twilio
app.post('/whatsapp', async (req, res) => {
    const incomingMessage = req.body.Body;  // Message sent by the user via WhatsApp
    const userNumber = req.body.From;    
    console.log("sample 3",incomingMessage, userNumber);
    // WhatsApp user's number

    let conversationIdNew = null

    let isConversationActive = await checkConversationStatus(conversationId, directLineToken)

    console.log("conversation active :", isConversationActive)

    if (isConversationActive) {
        conversationIdNew = conversationId
        console.log("use existing")
    } else {
        conversationIdNew = await startConversation();
        console.log("use new")
    }
    console.log("conversation id :", conversationIdNew)

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
            console.log("botReply intermediate : ", botReply)
            if (botReply?.text) {
                console.log("botReply condition 1 : ", botReply)
                botReply = botReply?.text
            } else if (botReply?.attachments) {
                // botReply = botReply?.attachments?.[0]?.content?.body?.[1]?.text
                botReply = JSON.stringify(botReply?.attachments?.[0]?.content?.body)
                console.log("botReply condition 2 : ", botReply)

            } else {
                console.log("botReply condition 3 : ", botReply)
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