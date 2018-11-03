var alertElement, keyElement, saveElement;
var timeouts = [];
var notNewlyInstalled;

document.addEventListener("DOMContentLoaded", function() {
	// Get DOM elements
	alertElement = document.getElementById("alert");
	keyElement = document.getElementById("key");
	saveElement = document.getElementById("save");
	
	// Bind function to save button
	saveElement.addEventListener("click", saved);
	
	// Load saved values into page
	chrome.storage.sync.get(["apiKey", "notNewlyInstalled"], loadStorage);
});

function loadStorage(data) {
	// Save newly installed state
	notNewlyInstalled = data.notNewlyInstalled;
	chrome.storage.sync.set({ "notNewlyInstalled": true });
	
	// Load API key into page
	if (data.apiKey && data.apiKey.length > 0) {
		keyElement.value = data.apiKey;
	}
	
}

function saved(event) {
	// Alert about empty API key input
	if (keyElement.value.length <= 0) {
		alertElement.innerHTML = "Missing API key";
		alertElement.className = "shown";
		clearTimeouts();
		timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
		timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
		return;
	}
	
	// Verify and save updated minimum value
	queryAPI("https://bunpro.jp/api/user/" + keyElement.value + "/study_queue", function(data) {
		if (data.error) {
			// Remove period from message string for consistency
			var msgNoPeriod = data.error.message;
			if (msgNoPeriod.substr(-1) === ".") {
				msgNoPeriod = msgNoPeriod.slice(0, -1);
			}
			
			alertElement.innerHTML = msgNoPeriod;
			alertElement.className = "shown";
			clearTimeouts();
			timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
			timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
		} else {
			chrome.storage.sync.set({ "apiKey": keyElement.value }, function() {
				alertElement.innerHTML = "Settings saved for " + data.user_information.username;
				alertElement.className = "shown";
				clearTimeouts();
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
				
				chrome.extension.getBackgroundPage().run();
				
				if (!notNewlyInstalled) timeouts.push(setTimeout(window.close, 2500));
			});
		}
	});
}

function clearTimeouts() {
	timeouts.forEach(function(to) {
		clearTimeout(to);
	});
	timeouts = [];
}

function queryAPI(path, callback) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === XMLHttpRequest.DONE) {
			if (xmlhttp.status === 401) {
				callback(JSON.parse(xmlhttp.responseText));
			} else {
				alertElement.innerHTML = "Error accessing Bunpro API";
				alertElement.innerHTML = path;
				alertElement.className = "shown";
				clearTimeouts();
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5000));
				timeouts.push(setTimeout(function() { alertElement.className = ""; }, 5500));
			}
		}
	};
	xmlhttp.open("GET", path, true);
	xmlhttp.send();
}
