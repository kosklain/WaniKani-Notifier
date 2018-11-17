var lastCheck = new Date().getTime() - 60000;
var scheduledAlert;
var apiKey;
var error = "";
var urlToVisit = "chrome://extensions/?options=" + chrome.runtime.id;

run();

function run() {
	chrome.storage.sync.get(["apiKey", "notNewlyInstalled"], loadSettings);
}

// Initialize extension
function loadSettings(data) {
	// Go to reviews when icon is clicked
	chrome.browserAction.onClicked.addListener(function(tab) {
		if (error) alert("Error:\n" + error);
		else chrome.tabs.create({ url: urlToVisit });
	});
	
	if (data.apiKey && data.apiKey.length > 0) {
		apiKey = data.apiKey;
		
		// Perform initial status check
		check();
		
		// Check every 10 minutes
		setInterval(check, 600000);
		
		// Re-check after returning to the reviews completed screen
		chrome.tabs.onUpdated.addListener(function(tab) {
			chrome.tabs.query({ "active": true, "currentWindow": true }, function(tabs) {
				if (typeof tabs[0] !== "undefined" && typeof tabs[0].url !== "undefined") {
					var url = tabs[0].url.toLowerCase();
					if (url.startsWith("https://www.bunpro.jp/") || url.startsWith("http://www.bunpro.jp/") {
						check();
					}
				}
			});
		});
	} else if (!data.notNewlyInstalled) {
		// Prompt for API key if missing
		chrome.tabs.create({ "url": "chrome://extensions/?options=" + chrome.runtime.id });
	}
}

// Check the API and update the times and internal data
function check() {
	if (lastCheck < new Date().getTime() - 10000) {
		lastCheck = new Date().getTime();
		
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState !== XMLHttpRequest.DONE || xmlhttp.status !== 401) return;
			
			var data  = JSON.parse(xmlhttp.responseText);
			
			error = "";
			if (data.error) {
				// API error
				error = data.error.message;
				chrome.browserAction.setIcon({ path: "icons/bunpro_grey.png" });
				chrome.browserAction.setTitle({ title: "Error:\n" + error });
				chrome.browserAction.setBadgeText({text: ""});
			} else if (data.requested_information.reviews_available > 0) {
				// Review is available
				urlToVisit = "https://www.bunpro.jp/study";
				chrome.browserAction.setIcon({ path: "icons/bunpro.png" });
				chrome.browserAction.setTitle({ title: "Begin Bunpro review" });
				chrome.browserAction.setBadgeText({text: data.requested_information.reviews_available.toString()});
			} else {
				// Waiting
				urlToVisit = "https://www.bunpro.jp/study";
				chrome.browserAction.setIcon({ path: "icons/bunpro_black.png" });
				chrome.browserAction.setTitle({ title: "Open Bunpro upcoming reviews" });
				
				// Schedule next check
				clearTimeout(scheduledAlert);
				scheduledAlert = setTimeout(check, data.requested_information.next_review_date * 1000 - new Date() / 1000 + 60000);

				chrome.browserAction.setBadgeText({text: ""});
			}
		};
		xmlhttp.open("GET", "https://bunpro.jp/api/user/" + apiKey + "/study_queue", true);
		xmlhttp.send();
	}
}
