const twilio = require('twilio');
const fetch = require('node-fetch');
const express = require('express')
var request = require('request');



const accountSid = 'ACb1bb9c97453b06f952e5051c43d69f5b';
const authToken = '1044c33ededbe2f41a630039a3c60e57';
const client = twilio(accountSid, authToken);

const app = express()
const port = 3000



app.post('/whatsapp-webhook', (req, res) => {
  const userMessage = req;
  // console.log(req)
  const directLineToken = 'A-oSxjR5Ll4.DXNUlIYP2kLrho6gdqg3f-cC-lHvUafbjPy4PoINaTE'

  // Send user message to the bot via Direct Line
  fetch('https://directline.botframework.com/v3/directline/conversations/<conversationId>/activities', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${directLineToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'message',
      from: { id: 'user1' },
      text: "hi"
    })
  })
  .then(response => response.json())
  .then(data => {
    // Send bot's response back to WhatsApp user
    // client.messages.create({
    //   from: 'whatsapp:+19524795897',  // Twilio's WhatsApp sandbox number
    //   to: 'whatsapp:+917395971053',
    //   body: data.activities[0].text
    // });
    console.log("sample")
  });

  res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
