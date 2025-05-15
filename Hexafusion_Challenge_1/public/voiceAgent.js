const log = (msg) => document.getElementById("log").innerText += msg + "\n";


async function speak(text) {
  log("Agent: " + text);
  const response = await fetch("http://localhost:3000/polly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  const { audioUrl } = await response.json();

  const audio = new Audio(audioUrl);
  await audio.play();
  return new Promise(resolve => audio.onended = resolve);
}

function listen() {
  return new Promise((resolve, reject) => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      log("Caller: " + result);
      resolve(result);
    };
    recognition.onerror = (e) => reject(e.error);
    recognition.start();
  });
}

async function extract(prompt) {
  const response = await fetch("http://localhost:3000/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({prompt})
  });
  const data = await response.json();
  return data.value;
}

async function runFlow(phoneNumber) {
  log("start call");
  let caller = {};
  let summary = "";
  let userInput = "";
  let response = "";
  let lastTime = 0;

  try {
    const response = await fetch("http://localhost:3000/mongo", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const result = await response.json();
    result.forEach(call => {
      //log(call.timestamp);
      if (call.phone===phoneNumber && call.timestamp>lastTime) {
        caller.phone=phoneNumber;
        caller.name=call.name;
        caller.company=call.company;
        caller.reason=call.reason;
        summary=call.summary;
        lastTime=call.timestamp
      }
        //log(`Name: ${call.name}, Phone: ${call.phone}, Company: ${call.company}, Reason: ${call.reason}, Summary: ${call.summary}`);
      });
  } catch (error) {
    console.error("Error:", error);
  }

  if (lastTime===0) {
    caller.phone=phoneNumber;
    await speak("Welcome! What is your full name?");
    userInput = await listen();
    caller.name = await extract("Extract the name from the following user input and do not add any comments or other text: "
        + userInput);

    await speak("Hello "+caller.name+". What company are you from?");
      userInput = await listen();
    caller.company = await extract("Extract the company name from the following user input and do not add any comments or other text: "
        + userInput);

    await speak("What is the reason for your call?");
      userInput = await listen();
    caller.reason = await extract("Extract the reason for calling from the following user input and do not add any comments: "
        + userInput);
    
    summary="The caller "+caller.name+" from the company "+caller.company
      +" started a call for the following reason:" +caller.reason;
    response = await extract(userInput);
  } else {
    response = await extract("Greet the caller and recall the last interaction. Here are the details of last interaction. "
      +"Caller name: "+caller.name+". Company name: "+caller.company+". Reason for call: "+caller.reason
      +". Summary of call: "+caller.summary+". Timestamp: "+(new Date(caller.timestamp)).toDateString()
    )
  }

  for (let i = 0; i < 1000; i++) {
    await speak(response);
    userInput = await listen();
    
    summary = await extract("Summary of the call: \""+summary
      +"\". Your last message was: \""+response
      +"\", to which the caller replied: \""+userInput
      +"\". Update the summary."
    );

    const endCall = await extract("Based on your previous message: \""+response
      +"\" and on the caller's response: \""+userInput
      +"\", does the caller want to leave the call now? Reply with one letter: Y for yes and N for no.");

    response = await extract("Summary of the call: \""+summary
      +"\". Respond to the caller's reply: \""+userInput+"\".");
    if (endCall=="Y") {
      await speak(response);
      break;
    }
  }
  caller.summary=summary;
  log("end call");

  try {
    const response = await fetch("http://localhost:3000/mongo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(caller)
    });

    const result = await response.json();
    console.log(result.message);
  } catch (error) {
    console.error("Error:", error);
  }
}

document.getElementById("startCall").addEventListener("click", async () => {
  const phoneNumber = document.getElementById("phone").value.trim();

  if (!phoneNumber) {
    alert("Please enter a phone number.");
    return;
  }

  await runFlow(phoneNumber);
});