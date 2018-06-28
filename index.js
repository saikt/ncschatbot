'use strict';
const line = require('@line/bot-sdk');
const express = require('express');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
const app = express();

const dateutil = require('date-utils');

const cradle = require("cradle");
const dbn = "conversation";
const cradle_host = process.env.CRADLE_HOST;
const cradle_port = process.env.CRADLE_PORT;
const cradle_url = process.env.CRADLE_URL;

const options = {
    cache : true,
    raw : false,
    secure : true,
    auth : {
        username : process.env.CRADLE_USERNAME,
        password : process.env.CRADLE_PASSWORD
    }
};
	
/****************グローバル変数****************/
var lineInputText;//LINEからの入力メッセージ
var translatedText; //日本語から翻訳された英文
var responseMessage; //LINEへの送信メッセージ

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/api/linewebhook', line.middleware(config), (req, res) => {
	Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result)).catch((err) => {console.error(err);res.status(500).end();});
});

// event handler
function handleEvent(event) {

	if (event.type !== 'message' || event.message.type !== 'text') {
		// ignore non-text-message event
		return Promise.resolve(null);
	}

	lineInputText = event.message.text;

	/****************Assistant API****************/
	var AssistantV1 = require('watson-developer-cloud/assistant/v1');
	var assistant = new AssistantV1({
	  username: '33b4f84f-4e74-4d14-99ed-1dd94f4c2cc8',
	  password: 'QJvBJrPwuoVf',
	  url: 'https://gateway.watsonplatform.net/assistant/api/',
	  version: '2018-02-16'
	});
	assistant.message(
		{
			input: { text: lineInputText },
			workspace_id: '638c33b3-485c-4889-b6fb-d6aebf1231cb'
		},
		function(err, response) {
			if (err) {
				console.error(err);
			} else {
				/****************cloudant API****************/
				// Cloudant接続                                                                                                      
				var db = new cradle.Connection(
				    cradle_host,
				    cradle_port,
				    options
				).database(dbn);

				var date = new Date();
				var now = date.toFormat("YYYY/MM/DD HH24:MI:SS");
 
				var doc = {
				    date: now,
				    request: lineInputText,
				    response: response.output.text[0]
				}

				// データベース保存                                                                                                  
				db.save(doc, function (err, res) {
				    if (err) {
				    console.log("err = ", err);
				    } else {
				    console.log("res = ", res);
				    }
				});
				const echo = { type: 'text', text: response.output.text[0] };
				return client.replyMessage(event.replyToken, echo);
			}
		}
	);

	// use reply API
	//return client.replyMessage(event.replyToken, translatedText);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {console.log(`listening on ${port}`);});
