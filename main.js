// NOTE: CustomTube's codename is BeamTube, which is why "bt" appears everywhere in the code.

// Most of the code in this section is from YouTube Redux.
let flags = {
	"recalcListenersAdded":false
};
let alignRetry = {
	startCount: 0,
	maxCount: 6,
	timeout: 20
};
let tasks = {
	"videoLooped": false,
	"movedHHButtons": false,
	"appliedWatchMetadata": "false",
	"moveVid": "false"
};
let BTVars = {
	"playlistWatch": false,
	"trimViews": false,
	"btlocation": "home",
	"playerState": "normal"
};
aspectRatio = (window.screen.width / window.screen.height).toFixed(2);
playerSize = {};
playerSize.width = 854;
playerSize.height = 480;
let observerComments;
let observerRelated;
let intervalsArray = [];
let isCheckingRecalc = false;
function waitFor(selector, interval, callback, timeout = 100 * 600 * 1000) {
	let wait = setInterval(() => {
		let element = document.querySelector(selector);

		if (element != null) {
			stopInterval(wait);
			callback();
		}
	}, interval);

	let stopInterval = (interval) => {
		clearInterval(interval);
		wait = undefined;
		let index = intervalsArray.indexOf(interval); //get index of and remove the previously added interval from array when it's cleared
		if (index !== -1) {
			intervalsArray.splice(index, 1);
		}
	};

	if (timeout) {
		setTimeout(() => {
			if (wait) {
				stopInterval(wait);
			}
		}, timeout);
	}

	intervalsArray.push(wait); //add current interval to array
}
if (BTConfig.noFlexy) {
	reCalculation();
}
if (BTConfig.layoutSelect == "cosmicpanda-3") {
	reCalculation();
}
if (BTConfig.layoutSelect == "hitchhiker-2013-1") {
	reCalculation();
}
if (BTConfig.layoutSelect == "hitchhiker-2013-2") {
	reCalculation();
}
function reCalculation() {
recalculateVideoSize();
	if (BTVars.btlocation == "watch") {
		waitFor('ytd-watch-flexy #movie_player', 10, recalculateVideoSize);
		waitFor('#redux-recalc', 10, alignItems);
	}

function alignItems() {
	let playerElement = document.querySelector('#player-container-outer');
	let content = document.querySelector('#columns > #primary > #primary-inner');
	let videoInfoElement = document.querySelector('#columns > #primary > #primary-inner #info ytd-video-primary-info-renderer');
	let calcPadding = Math.ceil(playerElement.getBoundingClientRect().left - content.getBoundingClientRect().left);

	if (calcPadding == 0 || calcPadding >= 1000 || playerElement == null || content == null || videoInfoElement == null) {
		waitFor('#columns > #primary > #primary-inner #info ytd-video-primary-info-renderer', 10, alignItems);
		return;
	} else if (!isTheater() && !isFullscreen()) {
		const reduxAlignElement = document.querySelector('#redux-style-align');
		const videoPlayer = document.querySelector('#player video');
		const calcInner = `
		#playlist > #container,
		ytd-playlist-panel-renderer#playlist {
			max-height: calc(${Math.ceil(videoPlayer.getBoundingClientRect().height)}px + 1px) !important;
		}
		#primary.ytd-watch-flexy > #primary-inner {
			padding-left: ${Math.max((calcPadding / window.innerWidth * 100).toFixed(3), 0)}vw !important;
		}
		#secondary.ytd-watch-flexy {
			margin-right: ${Math.max((calcPadding / window.innerWidth * 100).toFixed(3), 0)}vw !important;
		}
        `;

		if (!reduxAlignElement) {
			let customStyle = document.createElement("style");
			customStyle.id = 'redux-style-align';
			let customStyleInner = calcInner;
			customStyle.appendChild(document.createTextNode(customStyleInner));
			document.head.append(customStyle); 
		} else {
			reduxAlignElement.textContent = "";
			reduxAlignElement.appendChild(document.createTextNode(calcInner));
		}

		alignRetry.startCount++;
		if (alignRetry.startCount <= alignRetry.maxCount) {
			setTimeout(alignItems, alignRetry.timeout);
		} else {
			alignRetry.startCount = 0;
			return;
		}
	}
}
function recalculateVideoSize() {
	function addListenersForRecalc() {
		let buttons = [
			document.querySelector('.ytp-size-button')
			//document.querySelector('.ytp-fullscreen-button')
		];

		for (let i = 0; i < buttons.length; i++) {
			buttons[i].addEventListener('click', function() {
				videoSizeRecalculation();
				setTimeout(alignItems, 40); //TODO slow systems may struggle with this timeout when exiting fullscreen - properly detect mode change. BT: Changed from 40.
			});
		}
		document.addEventListener("fullscreenchange", function() {
			videoSizeRecalculation();
			setTimeout(alignItems, 40);
		});
		window.addEventListener('resize', () => {
			let repeatInsert = setInterval(() => { //insert in loop for X seconds to prevent YT from overriding
				let specialWidth = document.querySelector('video').offsetWidth;
				let specialHeight = document.querySelector('video').offsetHeight;
				insertRecalcScript(specialWidth, specialHeight);
			}, 500); //BT config change from 500 now 30
			setTimeout(() => {
				clearInterval(repeatInsert);
			}, 2000);
			alignItems();
		});
		flags.recalcListenersAdded = true;
	}

	function insertRecalcScript(width, height) {
		if (width == undefined) {width = playerSize.width;}
		if (height == undefined) {height = playerSize.height;}
		let existingRecalc = document.querySelector('#redux-recalc');
		if (existingRecalc) {existingRecalc.remove();}
		let script = document.createElement('script');
		script.id = 'redux-recalc';
		let scriptInner = `
            var player = document.querySelector('#movie_player');
            player.setInternalSize(${width},${height});
            `;
		script.appendChild(document.createTextNode(scriptInner));
		document.body.append(script);

		if (!isCheckingRecalc) {
			isCheckingRecalc = true;
			let checkLoop = setInterval(() => {
				checkIfProperlyRecalculated(width, height);
			}, 100);
    
			setTimeout(() => {
				clearInterval(checkLoop);
				isCheckingRecalc = false;
			}, 2000);

		}

		function checkIfProperlyRecalculated(width, height) {
			let videoPlayerElement = document.querySelector('ytd-watch-flexy .html5-video-container');
			let bottomBarElement = document.querySelector('.ytp-chrome-bottom');
			if (videoPlayerElement != null && bottomBarElement != null && (bottomBarElement.offsetWidth < videoPlayerElement.offsetWidth*0.9)) {
				insertRecalcScript(width, height);
			}
		}
	}
	function videoSizeRecalculation() {
		let checkingTimeout;
		let retryTimeout = 3500; 
		let retryCount = 0;
		let retryInterval = 600; //BT Changed from 10
		let checkingVideo = setInterval(() => { //check in loop for X seconds if player size is correct; reset checking if it's not; applied to fix initial page elements load
			let progressBar = document.querySelector('ytd-watch-flexy .ytp-chrome-bottom');
			let leftEdgeDistancePlayer = document.querySelector('#player-container-outer').getBoundingClientRect().x;
			let leftEdgeDistanceInfo = document.querySelector('#page-manager.ytd-app #primary-inner #info').getBoundingClientRect().x;
			let videoElement = document.querySelector('video');
			let widthCtrlElement = document.querySelector('#columns > #primary > #primary-inner #info');

			if ((widthCtrlElement.offsetWidth) < (playerSize.width-1)) { //condition for starting page in small window
				let specialWidth = document.querySelector('video').offsetWidth;
				let specialHeight = document.querySelector('video').offsetHeight;
				insertRecalcScript(specialWidth, specialHeight);
			}

			if (progressBar != null && (leftEdgeDistancePlayer > leftEdgeDistanceInfo+10 
				|| (progressBar.offsetWidth+24) <= videoElement.offsetWidth*0.95 
				|| (progressBar.offsetWidth+24) >= videoElement.offsetWidth*1.05) && !isTheater() && !isFullscreen()) { //TODO more precise condition
				insertRecalcScript();
				retryCount++;

				if ((retryCount*retryInterval) >= retryTimeout) {
					clearInterval(checkingVideo);
				}

				if (checkingTimeout != undefined) {
					clearTimeout(checkingTimeout);
					checkingTimeout = undefined;
				}
			} else {
				if (checkingTimeout == undefined) {
					checkingTimeout = setTimeout(() => {
						clearInterval(checkingVideo);
					}, retryTimeout);
				}
			}
		}, retryInterval);
	}
	if (!flags.recalcListenersAdded) {
		waitFor('.ytp-size-button', 10, addListenersForRecalc);
	} //to recalculate player size when changing between normal, theater and fullscreen modes
	videoSizeRecalculation();
}
function isTheater() {
	if (document.querySelector('ytd-watch-flexy[theater]') != null) {
		return true;
	}
}

function isFullscreen() {
	if (document.querySelector('ytd-watch-flexy[fullscreen]') != null) {
		return true;
	}
}
}

// YouTube Redux Code Ends
/* ----------------------------------------------------------- BT START ----------------------------------------------------------- */
/* BTSection getPREF */

waitFor('ytd-app', 1, getInitialVariables);
waitFor('ytd-app', 1, assignOnInitialLoad);
waitFor('ytd-app', 1, urlListen);
waitFor('ytd-app', 1, createNewElements);
waitFor('ytd-app', 1, moveElements);
waitFor('ytd-app', 1, repeatedActions);
// IMPORTANT: This function is passive! It is for getting variables only! This function is NOT for executing foreign functions! Stuff like my channel will need a thing here as well as elsewhere.
function getInitialVariables() {
	setTimeout(getSignedOut, 5);
	setTimeout(getRYD, 5);
	setTimeout(getBetterSearch, 5);
	setTimeout(getLayout, 5);
	setTimeout(getMaterialSearch, 10);
	setTimeout(getSquare, 10);
	setTimeout(getMyChannel, 10);
	setTimeout(getInfiScroll, 10);
	setTimeout(getFlexyPlayerOverride, 10);
	setTimeout(getJoin, 10);
	setTimeout(getClip, 10);
	setTimeout(getThanks, 10);
	setTimeout(getTrimmedViewCount, 15);
	setTimeout(getRelatedVideos, 10);
	setTimeout(getHref, 5);
	
	function getSignedOut() {
		waitFor("a[aria-label='Sign in']", 100, isSignedOut);
		function isSignedOut() {
			document.querySelector("html").setAttribute("signed-out", "");
		}
	}
	function getRYD() {
		if (!BTConfig.iUseRYD) {
			document.querySelector("ytd-app").setAttribute("no-ryd", "");
			document.querySelector("html").setAttribute("no-ryd", "");
		}
	}
	function getBetterSearch() {
		if (BTConfig.betterSearch) {
			document.querySelector("html").setAttribute("better-search", "");
		}
	}
	function getLayout() {
		document.querySelector("html").setAttribute("title-on-top", "false");
		document.querySelector("html").setAttribute("upload-btn", "false");
		if (BTConfig.layoutSelect == "polymer-2019") {
			document.querySelector("ytd-app").setAttribute("layout", "polymer");
			document.querySelector("html").setAttribute("layout", "polymer-2019");
			document.querySelector("html").setAttribute("color-style", "plmr");
			document.querySelector("html").setAttribute("channel-rework", "true");
			document.querySelector("html").setAttribute("related-videos", "polymer-2019");
			document.querySelector("ytd-app").setAttribute("layout-theme", "polymer-2019");
			//document.querySelector("html").setAttribute("layout-theme", "hitchhiker-2017");
			document.querySelector("html").setAttribute("search-bar-style", "polymer-2019");
			document.querySelector("html").setAttribute("watch-metadata-style", "polymer-2019");
			document.querySelector("html").setAttribute("chips-style", "polymer-2019");
			document.querySelector("html").setAttribute("topbar-style", "polymer-2019");
			document.querySelector("html").setAttribute("header-style", "polymer-2019");
			document.querySelector("html").setAttribute("sidebar-style", "polymer-2019");
			document.querySelector("html").setAttribute("homepage", "small-grid"); 
			document.querySelector("html").setAttribute("homepage-columns", "2"); 
			document.querySelector("html").setAttribute("grid-styling", "polymer-2019"); 
			document.querySelector("html").setAttribute("show-upload-date-next-to-pfp", "true");
			document.querySelector("html").setAttribute("sub-button-nested-sub-count", "true");
			document.querySelector("html").setAttribute("related-videos-size", "large");
			document.querySelector("html").setAttribute("upload-btn", "false");
			document.querySelector("html").setAttribute("search-style", "polymer-2019");
			document.querySelector("html").setAttribute("channel-style", "polymer-2019");
			document.querySelector("html").setAttribute("unrounded-vids", "");
		}
		if (BTConfig.layoutSelect == "hitchhiker-2017") {
			document.querySelector("ytd-app").setAttribute("layout", "hitchhiker");
			document.querySelector("html").setAttribute("layout", "hitchhiker-2017");
			document.querySelector("html").setAttribute("color-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("channel-rework", "true");
			document.querySelector("html").setAttribute("related-videos", "hitchhiker-2017");
			document.querySelector("ytd-app").setAttribute("layout-theme", "hitchhiker-2017");
			//document.querySelector("html").setAttribute("layout-theme", "hitchhiker-2017");
			document.querySelector("html").setAttribute("search-bar-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("watch-metadata-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("logo", "minimalism");
			document.querySelector("html").setAttribute("chips-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("topbar-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("header-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("sidebar-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("homepage", "small-grid"); 
			document.querySelector("html").setAttribute("homepage-columns", "2"); 
			document.querySelector("html").setAttribute("grid-styling", "hitchhiker-2017"); 
			document.querySelector("html").setAttribute("show-upload-date-inside-desc", "true");
			document.querySelector("html").setAttribute("related-videos-size", "large");
			document.querySelector("html").setAttribute("upload-btn", "false");
			document.querySelector("html").setAttribute("search-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("comments-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("channel-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("gaming-style", "hitchhiker-2017");
			document.querySelector("html").setAttribute("unrounded-vids", "");
			document.querySelector("html").setAttribute("unrounded-pfps", "");
		}
		if (BTConfig.layoutSelect == "hitchhiker-2016") {
			document.querySelector("ytd-app").setAttribute("layout", "hitchhiker");
			document.querySelector("html").setAttribute("layout", "hitchhiker-2016");
			document.querySelector("html").setAttribute("color-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("channel-rework", "true");
			document.querySelector("html").setAttribute("related-videos", "hitchhiker-2016");
			document.querySelector("ytd-app").setAttribute("layout-theme", "hitchhiker-2016");
			//document.querySelector("html").setAttribute("layout-theme", "hitchhiker-2017");
			document.querySelector("html").setAttribute("search-bar-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("watch-metadata-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("logo", "iconic");
			document.querySelector("html").setAttribute("chips-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("topbar-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("header-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("sidebar-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("homepage", "small-grid"); 
			document.querySelector("html").setAttribute("homepage-columns", "2"); 
			document.querySelector("html").setAttribute("grid-styling", "hitchhiker-2016"); 
			document.querySelector("html").setAttribute("show-upload-date-inside-desc", "true");
			document.querySelector("html").setAttribute("related-videos-size", "small");
			document.querySelector("html").setAttribute("upload-btn", "true");
			document.querySelector("html").setAttribute("search-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("comments-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("channel-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("gaming-style", "hitchhiker-2016");
			document.querySelector("html").setAttribute("unrounded-vids", "");
			document.querySelector("html").setAttribute("unrounded-pfps", "");
		}
		if (BTConfig.layoutSelect == "hitchhiker-2015") {
			document.querySelector("ytd-app").setAttribute("layout", "hitchhiker");
			document.querySelector("html").setAttribute("layout", "hitchhiker-2015");
			document.querySelector("html").setAttribute("color-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("channel-rework", "true");
			document.querySelector("html").setAttribute("related-videos", "hitchhiker-2015");
			document.querySelector("ytd-app").setAttribute("layout-theme", "hitchhiker-2015");
			//document.querySelector("html").setAttribute("layout-theme", "hitchhiker-2017");
			document.querySelector("html").setAttribute("search-bar-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("watch-metadata-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("logo", "shady");
			document.querySelector("html").setAttribute("chips-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("topbar-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("header-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("sidebar-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("homepage", "small-grid"); 
			document.querySelector("html").setAttribute("homepage-columns", "2"); 
			document.querySelector("html").setAttribute("grid-styling", "hitchhiker-2015"); 
			document.querySelector("html").setAttribute("show-upload-date-inside-desc", "true");
			document.querySelector("html").setAttribute("related-videos-size", "small");
			document.querySelector("html").setAttribute("upload-btn", "true");
			document.querySelector("html").setAttribute("search-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("comments-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("channel-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("gaming-style", "hitchhiker-2015");
			document.querySelector("html").setAttribute("unrounded-vids", "");
			document.querySelector("html").setAttribute("unrounded-pfps", "strict");
		}
		if (BTConfig.layoutSelect == "hitchhiker-2014") {
			document.querySelector("ytd-app").setAttribute("layout", "hitchhiker");
			document.querySelector("html").setAttribute("layout", "hitchhiker-2014");
			document.querySelector("html").setAttribute("color-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("channel-rework", "true");
			document.querySelector("html").setAttribute("related-videos", "hitchhiker-2014");
			document.querySelector("ytd-app").setAttribute("layout-theme", "hitchhiker-2014");
			//document.querySelector("html").setAttribute("layout-theme", "hitchhiker-2017");
			document.querySelector("html").setAttribute("search-bar-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("watch-metadata-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("logo", "shady");
			document.querySelector("html").setAttribute("chips-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("topbar-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("header-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("sidebar-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("homepage", "smaller-grid"); 
			document.querySelector("html").setAttribute("homepage-columns", "2"); 
			document.querySelector("html").setAttribute("grid-styling", "hitchhiker-2014"); 
			document.querySelector("html").setAttribute("show-upload-date-inside-desc", "true");
			document.querySelector("html").setAttribute("related-videos-size", "small");
			document.querySelector("html").setAttribute("upload-btn", "true");
			document.querySelector("html").setAttribute("search-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("comments-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("gaming-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("channel-style", "hitchhiker-2014");
			document.querySelector("html").setAttribute("unrounded-vids", "");
			document.querySelector("html").setAttribute("unrounded-pfps", "strict");
		}
		if (BTConfig.layoutSelect == "hitchhiker-2013-2") {
			document.querySelector("ytd-app").setAttribute("layout", "hitchhiker");
			document.querySelector("html").setAttribute("layout", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("color-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("channel-rework", "true");
			document.querySelector("html").setAttribute("related-videos", "hitchhiker-2013-2");
			document.querySelector("ytd-app").setAttribute("layout-theme", "hitchhiker-2013-2");
			//document.querySelector("html").setAttribute("layout-theme", "hitchhiker-2017");
			document.querySelector("html").setAttribute("search-bar-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("watch-metadata-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("logo", "squished");
			document.querySelector("html").setAttribute("chips-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("topbar-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("header-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("sidebar-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("homepage", "small-grid"); 
			document.querySelector("html").setAttribute("homepage-columns", "2"); 
			document.querySelector("html").setAttribute("grid-styling", "hitchhiker-2013-2"); 
			document.querySelector("html").setAttribute("show-upload-date-inside-desc", "true");
			document.querySelector("html").setAttribute("related-videos-size", "small");
			document.querySelector("html").setAttribute("upload-btn", "true");
			document.querySelector("html").setAttribute("search-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("comments-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("channel-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("gaming-style", "hitchhiker-2013-2");
			document.querySelector("html").setAttribute("static-scrolling", "");
			document.querySelector("ytd-app").setAttribute("static-scrolling", "");
			document.querySelector("html").setAttribute("pseudo-static", "");
			document.querySelector("html").setAttribute("unrounded-vids", "");
			document.querySelector("html").setAttribute("unrounded-pfps", "strict");
		}
		if (BTConfig.layoutSelect == "hitchhiker-2013-1") {
			document.querySelector("ytd-app").setAttribute("layout", "hitchhiker");
			document.querySelector("html").setAttribute("layout", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("color-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("channel-rework", "true");
			document.querySelector("html").setAttribute("related-videos", "hitchhiker-2013-1");
			document.querySelector("ytd-app").setAttribute("layout-theme", "hitchhiker-2013-1");
			//document.querySelector("html").setAttribute("layout-theme", "hitchhiker-2017");
			document.querySelector("html").setAttribute("search-bar-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("watch-metadata-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("logo", "squished");
			document.querySelector("html").setAttribute("chips-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("topbar-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("header-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("sidebar-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("homepage", "small-grid"); 
			document.querySelector("html").setAttribute("homepage-columns", "2"); 
			document.querySelector("html").setAttribute("grid-styling", "hitchhiker-2013-1"); 
			document.querySelector("html").setAttribute("show-upload-date-inside-desc", "true");
			document.querySelector("html").setAttribute("related-videos-size", "small");
			document.querySelector("html").setAttribute("search-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("comments-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("channel-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("gaming-style", "hitchhiker-2013-1");
			document.querySelector("html").setAttribute("upload-btn", "true");
			document.querySelector("html").setAttribute("static-scrolling", "");
			document.querySelector("ytd-app").setAttribute("static-scrolling", "");
			document.querySelector("html").setAttribute("pseudo-static", "");
			document.querySelector("html").setAttribute("unrounded-vids", "");
			document.querySelector("html").setAttribute("unrounded-pfps", "strict");
		}
		if (BTConfig.layoutSelect == "cosmicpanda-3") {
			document.querySelector("ytd-app").setAttribute("layout", "cosmicpanda");
			document.querySelector("html").setAttribute("layout", "cosmicpanda-3");
			document.querySelector("html").setAttribute("color-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("channel-rework", "true");
			document.querySelector("html").setAttribute("related-videos", "cosmicpanda-3");
			document.querySelector("ytd-app").setAttribute("layout-theme", "cosmicpanda-3");
			//document.querySelector("html").setAttribute("layout-theme", "hitchhiker-2017");
			document.querySelector("html").setAttribute("search-bar-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("watch-metadata-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("logo", "soft");
			document.querySelector("html").setAttribute("chips-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("topbar-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("header-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("header-visible", "");
			document.querySelector("html").setAttribute("sidebar-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("homepage", "list"); 
			document.querySelector("html").setAttribute("homepage-columns", "2"); 
			document.querySelector("html").setAttribute("grid-styling", "cosmicpanda-3"); 
			document.querySelector("html").setAttribute("show-upload-date-inside-desc", "true");
			document.querySelector("html").setAttribute("related-videos-size", "smaller");
			document.querySelector("html").setAttribute("search-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("comments-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("channel-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("gaming-style", "cosmicpanda-3");
			document.querySelector("html").setAttribute("upload-btn", "true");
			document.querySelector("html").setAttribute("static-scrolling", "");
			document.querySelector("ytd-app").setAttribute("static-scrolling", "");
			document.querySelector("html").setAttribute("static", "");
			document.querySelector("ytd-app").setAttribute("static", "");
			document.querySelector("html").setAttribute("unrounded-vids", "");
			document.querySelector("html").setAttribute("unrounded-pfps", "strict");
			document.querySelector("html").setAttribute("title-on-top", "true");
		}
	}
	function getMaterialSearch() {
		if (BTConfig.searchbarStyle == "material") {
			document.querySelector("html").setAttribute("search-bar-style", "material");
		}
	}
	function getSquare() {
		if (BTConfig.squareVid) {
			document.querySelector("html").setAttribute("unrounded-vids", "");
		}
		if (BTConfig.squarePfp) {
			document.querySelector("html").setAttribute("unrounded-pfps", "strict");
		}
	}
	function getMyChannel() {
		document.querySelector("html").setAttribute("my-channel-btn", "false");
		if (BTConfig.myChannelSidebarBtn) {
			document.querySelector("html").setAttribute("my-channel-btn", "true");
		}
	}
	function getInfiScroll() {
		document.querySelector("html").setAttribute("disable-infi-scroll", "false");
		if (BTConfig.noInfi) {
			document.querySelector("html").setAttribute("disable-infi-scroll", "true");
		}
	}
	function getFlexyPlayerOverride() {
		if (BTConfig.noFlexy) {
			document.querySelector("html").setAttribute("disable-flexy-player", "true");
		}
	}
	function getJoin() {
		if (BTConfig.noJoin) {
			document.querySelector("html").setAttribute("no-join", "");
		}
	}
	function getClip() {
		if (BTConfig.noClip) {
			document.querySelector("html").setAttribute("no-clip", "");
		}
	}
	function getThanks() {
		if (BTConfig.noThanks) {
			document.querySelector("html").setAttribute("no-thanks", "");
		}
	}
	function getTrimmedViewCount() {
		BTVars.trimViews = false;
		if (BTConfig.layoutSelect == "hitchhiker-2015") {
			BTVars.trimViews = true;
		}
		if (BTConfig.layoutSelect == "hitchhiker-2014") {
			BTVars.trimViews = true;
		}
		if (BTConfig.layoutSelect == "hitchhiker-2013-2") {
			BTVars.trimViews = true;
		}
		if (BTConfig.layoutSelect == "hitchhiker-2013-1") {
		    BTVars.trimViews = true;
		}
		if (BTConfig.layoutSelect == "cosmicpanda-3") {
		    BTVars.trimViews = true;
		}
	}
	function getRelatedVideos() {
		if (BTConfig.relatedSize == "small") {
			document.querySelector("html").setAttribute("related-videos-size", "small");
		}
		if (BTConfig.relatedSize == "medium") {
			document.querySelector("html").setAttribute("related-videos-size", "medium");
		}
		if (BTConfig.relatedSize == "large") {
			document.querySelector("html").setAttribute("related-videos-size", "large");
		}
	}
}
function assignOnInitialLoad() {
	waitFor('ytd-guide-entry-renderer #endpoint', 1, assignSidebarItems);
	function assignSidebarItems() {
		var Section1 = document.querySelectorAll('ytd-guide-section-renderer')[0];
		var Section2 = document.querySelectorAll('ytd-guide-section-renderer')[1];
		Section1.querySelectorAll('ytd-guide-entry-renderer')[0].setAttribute("id", "bt-home-button");
		//Section1.querySelectorAll('ytd-guide-entry-renderer')[1].setAttribute("id", "bt-shorts-button");
		Section1.querySelector('ytd-guide-entry-renderer a[title="Shorts"]').parentNode.setAttribute("id", "bt-shorts-button");
		Section1.querySelector('ytd-guide-entry-renderer a[title="Subscriptions"]').parentNode.setAttribute("id", "bt-subs-button");
		waitFor("#endpoint[title='Liked videos']", 100, doLikedVidsBtn);
		function doLikedVidsBtn() {
			let likedVids = document.querySelector("#endpoint[title='Liked videos']");
			let likedVidsBtn = likedVids.parentNode;
			likedVidsBtn.setAttribute("id", "bt-liked-vids-button");
		}
		let watchHistory = document.querySelector("#endpoint[title='History']");
		let historyBtn = watchHistory.parentNode;
		historyBtn.setAttribute("id", "bt-history-button");
		// Note: no need to do this with show less, as it already has an id of #collapser-item.
		Section1.querySelector('ytd-guide-collapsible-entry-renderer[can-show-more]').setAttribute("id", "bt-show-more-button");
		Section2.querySelector('ytd-guide-collapsible-entry-renderer[can-show-more]').setAttribute("id", "bt-show-more-button-2");
		waitFor('ytd-guide-entry-renderer #endpoint[title="Trending"]', 1, mustWaitMore);
		function mustWaitMore() {
			var Section3 = document.querySelectorAll('ytd-guide-section-renderer')[2];
			Section3.setAttribute("id","#bt-section-3");
			Section3.querySelectorAll('ytd-guide-entry-renderer')[0].setAttribute("id", "bt-trending-button");
		}
		waitFor('ytd-guide-entry-renderer', 5, shortsSidebarItemThing);
		function shortsSidebarItemThing() {
			if (BTConfig.homeSidebarBtn) {
				document.querySelector("html").setAttribute("home-btn", "true");
				if (BTConfig.layoutSelect == "hitchhiker-2015") {
					document.querySelector("#bt-home-button yt-formatted-string").innerText = "What to Watch";
					document.querySelector("#bt-home-button #endpoint").title = "What to Watch";
				}
				if (BTConfig.layoutSelect == "hitchhiker-2014") {
					document.querySelector("#bt-home-button yt-formatted-string").innerText = "What to Watch";
					document.querySelector("#bt-home-button #endpoint").title = "What to Watch";
				}
				if (BTConfig.layoutSelect == "hitchhiker-2013-2") {
					document.querySelector("#bt-home-button yt-formatted-string").innerText = "What to Watch";
					document.querySelector("#bt-home-button #endpoint").title = "What to Watch";
				}
				if (BTConfig.layoutSelect == "hitchhiker-2013-1") {
					document.querySelector("#bt-home-button yt-formatted-string").innerText = "What to Watch";
					document.querySelector("#bt-home-button #endpoint").title = "What to Watch";
				}
				if (BTConfig.layoutSelect == "cosmicpanda-3") {
					document.querySelector("#bt-home-button yt-formatted-string").innerText = "From YouTube";
					document.querySelector("#bt-home-button #endpoint").title = "From YouTube";
				}
				if (BTConfig.wtwSidebarBtn) {
					document.querySelector("#bt-home-button yt-formatted-string").innerText = "What to Watch";
					document.querySelector("#bt-home-button #endpoint").title = "What to Watch";
				}
				if (BTConfig.fytSidebarBtn) {
					document.querySelector("#bt-home-button yt-formatted-string").innerText = "From YouTube";
					document.querySelector("#bt-home-button #endpoint").title = "From YouTube";
				}
				if (BTConfig.NOTwtwSidebarBtn) {
					document.querySelector("#bt-home-button yt-formatted-string").innerText = "Home";
					document.querySelector("#bt-home-button #endpoint").title = "Home";
				}
			} else {
				document.querySelector("#bt-home-button").remove();
			}
			if (BTConfig.shortsSidebarBtn) {
				document.querySelector("html").setAttribute("shorts-btn", "true");
			} else {
				document.querySelector("#bt-shorts-button").remove();
			}
			if (BTConfig.subsSidebarBtn) {
				document.querySelector("html").setAttribute("subs-btn", "true");
			} else {
				document.querySelector("#bt-subs-button").remove();
			}
		}
	}
}
/* BTSection getHREF */
function getHref() {
		const location = window.location;
		if (location.pathname === '/') {
			BTVars.btlocation = "home";
			document.querySelector("ytd-app").setAttribute("location", "home");
			document.querySelector("html").setAttribute("location", "home");
		} else if (location.href.includes('/watch?')) {
			tasks.appliedWatchMetadata = "false";
			BTVars.btlocation = "watch";
			document.querySelector("html").setAttribute("location", "watch");
			if (BTConfig.noFlexy) {
				reCalculation();
			}
			if (BTConfig.layoutSelect == "cosmicpanda-3") {
				reCalculation();
			}
			if (BTConfig.layoutSelect == "hitchhiker-2013-1") {
				reCalculation();
			}
			if (BTConfig.layoutSelect == "hitchhiker-2013-2") {
				reCalculation();
			}
			if (location.href.includes('&list=')) {
			document.querySelector("ytd-app").setAttribute("watchtype", "playlistwatch");
			BTVars.playlistWatch = true;
			} else {
				document.querySelector("ytd-app").setAttribute("watchtype", "normal");
				BTVars.playlistWatch = false;
			}
			document.querySelector("ytd-app").setAttribute("location", "watch");
			document.querySelector("ytd-app").setAttribute("can-infi-scroll-related", "yes");
			waitFor('html[disable-infi-scroll="true"] #related ytd-continuation-item-renderer', 1, infiFunction);
			function infiFunction() {
				document.querySelector("html[location='watch'] ytd-watch-flexy #secondary #related ytd-continuation-item-renderer").style.display = "none";
			}
		} else if (location.pathname.startsWith('/u') || location.pathname.startsWith('/c') || location.pathname.startsWith('/@') ) {
			BTVars.btlocation = "channel";
		    document.querySelector("ytd-app").setAttribute("location", "channel");
			document.querySelector("html").setAttribute("location", "channel");
		} else if (location.href.includes('/feed/trending')) {
			BTVars.btlocation = "trending";
			document.querySelector("ytd-app").setAttribute("location", "trending");
			document.querySelector("html").setAttribute("location", "trending");
		/* in case they bring back explore */
		} else if (location.href.includes('/feed/explore')) {
			BTVars.btlocation = "explore";
			document.querySelector("ytd-app").setAttribute("location", "explore");
			document.querySelector("html").setAttribute("location", "explore");
		} else if (location.href.includes('/feed/sidebar')) {
			BTVars.btlocation = "sidebar";
			document.querySelector("ytd-app").setAttribute("location", "sidebar");
			document.querySelector("html").setAttribute("location", "sidebar");
		} else if (location.href.includes('/results?')) {
			BTVars.btlocation = "search";
			document.querySelector("ytd-app").setAttribute("location", "search");
			document.querySelector("html").setAttribute("location", "search");
		} else if (location.href.includes('/shorts/')) {
			BTVars.btlocation = "shorts";
			document.querySelector("ytd-app").setAttribute("location", "stupid");
			document.querySelector("html").setAttribute("location", "shorts");
		} else if (location.href.includes('/playlist?list=LL')) {
			BTVars.btlocation = "likedvideos";
			document.querySelector("ytd-app").setAttribute("location", "likedvideos");
			document.querySelector("html").setAttribute("location", "likedvideos");
		} else if (location.href.includes('/playlist?list=WL')) {
			BTVars.btlocation = "watchlater";
			document.querySelector("ytd-app").setAttribute("location", "watchlater");
			document.querySelector("html").setAttribute("location", "watchlater");
		} else if (location.href.includes('/history')) {
			BTVars.btlocation = "history";
			document.querySelector("ytd-app").setAttribute("location", "history");
			document.querySelector("html").setAttribute("location", "history");
		} else if (location.href.includes('/library')) {
			BTVars.btlocation = "library";
			document.querySelector("ytd-app").setAttribute("location", "library");
			document.querySelector("html").setAttribute("location", "library");
		} else if (location.href.includes('/subscriptions')) {
			BTVars.btlocation = "subscriptions";
			document.querySelector("ytd-app").setAttribute("location", "subscriptions");
			document.querySelector("html").setAttribute("location", "subscriptions");
		} else if (location.href.includes('/guide')) {
			BTVars.btlocation = "browse-channels";
			document.querySelector("ytd-app").setAttribute("location", "browse-channels");
			document.querySelector("html").setAttribute("location", "browse-channels");
		} else if (location.href.includes('/feed/')) {
			BTVars.btlocation = "feed";
			document.querySelector("ytd-app").setAttribute("location", "feed");
			document.querySelector("html").setAttribute("location", "feed");
		} else if (location.href.includes('/playlist')) {
			BTVars.btlocation = "playlist";
			document.querySelector("ytd-app").setAttribute("location", "playlist");
			document.querySelector("html").setAttribute("location", "playlist");
		} else {
			BTVars.btlocation = "unknown";
			document.querySelector("ytd-app").setAttribute("location", "unknown");
			document.querySelector("html").setAttribute("location", "unknown");
		} 
}
let currentPage = location.href;
// listen for changes
var urlListen = setInterval(function()
{

    if (currentPage != location.href)
    {
        // page has changed, set new page as 'current'
        currentPage = location.href;
		BTVars.btlocation = "unknown";
		document.querySelector('html').setAttribute('inline-channel','false');
		waitFor("ytd-watch-flexy", 100, removeAttributeGuide);
		function removeAttributeGuide() {
			document.querySelector("ytd-watch-flexy").setAttribute("guide", "");
			document.querySelector("ytd-watch-flexy").removeAttribute("guide");
		}
		waitFor("#bt-view-count span", 10, reFogViewCount);
		function reFogViewCount() {
			if (!BTVars.trimViews) {
			document.querySelector("#bt-view-count span").innerText = "???,??? views";
			}
			if (BTVars.trimViews) {
			document.querySelector("#bt-view-count span").innerText = "???,???";
			}
		}

		setTimeout(getHref, 100);
		if (BTConfig.loopByDefault) {
			waitFor('video', 4000, prepForLoopVideo);
		}
       
    }
	if (BTVars.btlocation == "watch" && tasks.appliedWatchMetadata == "false") {
		waitFor('#above-the-fold', 1000, watchPageEveryLoad);
	}
}, 330);
/* BTSection loop video */
if (BTConfig.loopByDefault) {
	setTimeout(loopVideo, 5000);
	function loopVideo() {
		if (!BTConfig.dontLoopPlaylists) {
		document.querySelector("video").setAttribute ('loop', '');
		}
		if (BTConfig.dontLoopPlaylists) {
			if (BTVars.playlistWatch) {
			} 
			if (!BTVars.playlistWatch) {
				document.querySelector("video").setAttribute ('loop', '');
			}
		}
	}
	function prepForLoopVideo() {
		var loopedVid = document.querySelector("ytd-watch-flexy video").getAttribute("loop");
		if (!BTConfig.dontLoopPlaylists) {
			if (loopedVid !== null) {
				tasks.videoLooped = true;
			} else {
				waitFor('video', 100, loopVideo);
			}
		}
		if (BTConfig.dontLoopPlaylists) {
			if (!BTVars.playlistWatch) {
				if (loopedVid !== null) {
					tasks.videoLooped = true;
				} else {
					waitFor('video', 100, loopVideo);
				}
			}
		}
	}
}
/* ----------------------------------------------------------- BT New Elements ----------------------------------------------------------- */
function createNewElements() {
	waitFor('html[layout] #guide-button yt-icon', 1, createNewGuideIcon);
	waitFor('html[layout] ytd-masthead #end', 1, createUploadButton);
	waitFor('html[layout] #content.ytd-app', 1, createNewHeader);
	waitFor('html[layout] #bt-home-button', 1, createNewHomeIcon);
	waitFor('ytd-guide-entry-renderer', 1, createMyChannel);
	waitFor('html[layout] #bt-trending-button', 1, createNewTrendingIcon);
	waitFor('html[layout] #bt-subs-button', 1, createNewSubsIcon);
	waitFor('html[layout] #bt-history-button', 1, createNewHistoryIcon);
	waitFor('html[layout] #bt-liked-vids-button', 1, createNewLikedVidsIcon);
	waitFor('html[layout] #bt-show-more-button', 1, createNewExpandIcon);
	waitFor('html[layout] #bt-show-more-button', 1, createNewExpandIcon2);
	waitFor('html[layout] #collapser-item', 1, createNewCollapseIcon);
	waitFor('ytd-watch-flexy #below', 100, createAbove);
	waitFor('html[layout] ytd-watch-flexy #top-row  #owner', 10, createStandardViewCount);
	waitFor('html[layout] #segmented-like-button span', 10, createLtoDBar);
	waitFor('html[layout] #segmented-like-button yt-icon', 500, createNewLikeIcon);
	waitFor('html[layout] #segmented-dislike-button', 1, createNewDisLikeIcon);
	waitFor('html[layout][location="watch"] #owner-sub-count', 10, createPfpUploadDate);
	if (BTConfig.iUseRYD) {
		waitFor('html[layout] .ryd-tooltip', 50, createMiddleRow);
	}
	if (!BTConfig.iUseRYD) {
		waitFor('html[layout] #segmented-like-button', 50, createMiddleRow);
	}
	waitFor('html[layout] ytd-watch-flexy #above-the-fold #description-inner', 1, createDescUploadDate);
	waitFor('html[layout] ytd-watch-flexy #above-the-fold ytd-text-inline-expander', 1, createNewShowMoreButton);
	waitFor('html[layout] ytd-watch-flexy #above-the-fold ytd-text-inline-expander', 1, createNewShowLessButton);
	//Disabled for now due to bugs. Might fix in an update. waitFor('html[location="home"][disable-infi-scroll="true"] ytd-two-column-browse-results-renderer[page-subtype="home"] ytd-rich-grid-renderer', 10, createShowMoreHome);
	//Disabled for now due to bugs. Might fix in an update. waitFor('html[location="channel"][disable-infi-scroll="true"] ytd-two-column-browse-results-renderer[page-subtype="channels"] ytd-rich-grid-renderer', 10, createShowMoreChannel);
	waitFor('html[location="watch"][disable-infi-scroll="true"] #related ytd-thumbnail', 10, createShowMoreRelated);
	function createNewGuideIcon() {
		let container = document.querySelector('#guide-button yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-guide-icon';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#guide-button svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#guide-button yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0]);
	}
	function createUploadButton() {
		let container = document.querySelector('ytd-masthead #end');
		const newElem = document.createElement("div");
		newElem.id = 'bt-upload-button';
		newElem.setAttribute("class", "bt-universalized-element bt-standard-button");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<a id="upload-btn" href="https://www.youtube.com/upload">
			<span>Upload</span>
		</a>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewHeader() {
		let container = document.querySelector('#content.ytd-app');
		const newElem = document.createElement("div");
		newElem.id = 'bt-header';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<div id="bt-header-inner">
		<div id="left">
			<div id="left-inner">
				<a id="browse-chan" href="https://www.youtube.com/feed/guide_builder">
					<div id="browse-chan-inner">
						<span>Browse Channels</span>
					</div>
				</a>
			</div>
		</div>
		<div id="middle">
			<div id="middle-inner">
				<div id="info">
					<div class="header-info" id="homeinfo">
						<div class="header-img">
						</div>
						<p class="header-text">From YouTube</p>
					</div>
					<div class="header-info" id="subsinfo">
						<div class="header-img">
						</div>
						<p class="header-text">Subscriptions</p>
					</div>
					<div class="header-info" id="bcinfo">
						<div class="header-img">
						</div>
						<p class="header-text">Browse Channels</p>
					</div>
				</div>
			</div>
		</div>
		<div id="right">
			<div id="right-inner">
			</div>
		</div>
		</div>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewHomeIcon() {
		let container = document.querySelector('#bt-home-button yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-home-icon';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#bt-home-button svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#bt-home-button yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createMyChannel() {
		let sidebar = document.querySelector('ytd-guide-section-renderer #items');
		const myCh = document.createElement("bt-sidebar-item-renderer");
		myCh.id = 'bt-my-channel-btn';
		myCh.setAttribute("class", "bt-universalized-element style-scope bt-simple-sidebar-item");
		myCh.setAttribute("bt-optimized-universal-element", "");
		if (!BTConfig.lowerCaseC) {
		myCh.innerHTML = `
		<a href="/profile" title="My Channel">
			<bt-icon id="filled">
				<svg icon-type="plmr">
					<g>
						<path d="M3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2zm12 4c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-9 8c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1H6v-1z"></path>
					</g>
				</svg>
			</bt-icon>
			<bt-icon id="outline">
				<svg icon-type="PLMR">
					<g>
						<path d="M3,3v18h18V3H3z M4.99,20c0.39-2.62,2.38-5.1,7.01-5.1s6.62,2.48,7.01,5.1H4.99z M9,10c0-1.65,1.35-3,3-3s3,1.35,3,3 c0,1.65-1.35,3-3,3S9,11.65,9,10z M12.72,13.93C14.58,13.59,16,11.96,16,10c0-2.21-1.79-4-4-4c-2.21,0-4,1.79-4,4 c0,1.96,1.42,3.59,3.28,3.93c-4.42,0.25-6.84,2.8-7.28,6V4h16v15.93C19.56,16.73,17.14,14.18,12.72,13.93z"></path>
					</g>
				</svg>
			</bt-icon>
			<span id="text">My Channel</span>
		</a>
		`;
		}
		if (BTConfig.lowerCaseC) {
		myCh.innerHTML = `
		<a href="/profile" title="My channel">
			<bt-icon id="filled">
				<svg icon-type="plmr">
					<g>
						<path d="M3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.11 0-2 .9-2 2zm12 4c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm-9 8c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1H6v-1z"></path>
					</g>
				</svg>
			</bt-icon>
			<bt-icon id="outline">
				<svg icon-type="PLMR">
					<g>
						<path d="M3,3v18h18V3H3z M4.99,20c0.39-2.62,2.38-5.1,7.01-5.1s6.62,2.48,7.01,5.1H4.99z M9,10c0-1.65,1.35-3,3-3s3,1.35,3,3 c0,1.65-1.35,3-3,3S9,11.65,9,10z M12.72,13.93C14.58,13.59,16,11.96,16,10c0-2.21-1.79-4-4-4c-2.21,0-4,1.79-4,4 c0,1.96,1.42,3.59,3.28,3.93c-4.42,0.25-6.84,2.8-7.28,6V4h16v15.93C19.56,16.73,17.14,14.18,12.72,13.93z"></path>
					</g>
				</svg>
			</bt-icon>
			<span id="text">My channel</span>
		</a>
		`;
		}
		sidebar.insertBefore(myCh, sidebar.children[0].nextSibling);	
	}
	function createNewTrendingIcon() {
		let container = document.querySelector('#bt-trending-button yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-trending-icon';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#bt-trending-button svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#bt-trending-button yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M19.642 10.63c-.314-.395-.658-.767-1.026-1.11-.87-.808-1.884-1.375-2.724-2.22-1.72-1.73-2.3-4.183-1.546-6.496.123-.375-.23-.72-.584-.566-.822.36-1.606.873-2.285 1.425-3.43 2.79-4.704 7.446-3.115 11.645.038.144.09.3.09.45 0 .3-.182.57-.448.687-.3.133-.62.044-.856-.175-.072-.068-.137-.143-.197-.222-1.11-1.452-1.52-3.386-1.21-5.19.08-.456-.49-.713-.77-.35-1.4 1.802-2.09 4.21-1.95 6.48.04.68.158 1.355.34 2.008.23.82.57 1.607 1.01 2.33 1.4 2.31 3.854 3.977 6.49 4.31 2.805.355 5.836-.162 7.997-2.15 2.408-2.217 3.285-5.74 2-8.823-.052-.123-.106-.243-.163-.363-.285-.596-.64-1.154-1.045-1.67m-4.288 8.098c-.366.324-.95.645-1.415.797-1.32.435-2.62-.083-3.516-.814-.13-.1-.084-.3.073-.35 1.37-.44 2.173-1.49 2.41-2.542.23-1.015-.182-1.885-.354-2.878-.14-.827-.128-1.544.135-2.297.047-.13.226-.147.283-.02.82 1.825 3.136 2.63 3.534 4.64.037.18.058.367.063.55.034 1.06-.427 2.226-1.21 2.92"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewSubsIcon() {
		let container = document.querySelector('#bt-subs-button yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-subs-icon';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#bt-subs-button svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#bt-subs-button yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M18.7 8.7H5.3V7h13.4v1.7zm-1.7-5H7v1.6h10V3.7zm3.3 8.3v6.7c0 1-.7 1.6-1.6 1.6H5.3c-1 0-1.6-.7-1.6-1.6V12c0-1 .7-1.7 1.6-1.7h13.4c1 0 1.6.8 1.6 1.7zm-5 3.3l-5-2.7V18l5-2.7z"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewHistoryIcon() {
		let container = document.querySelector('#bt-history-button yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-history-icon';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#bt-history-button svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#bt-history-button yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M11.9 3.75c-4.55 0-8.23 3.7-8.23 8.25H.92l3.57 3.57.04.13 3.7-3.7H5.5c0-3.54 2.87-6.42 6.42-6.42 3.54 0 6.4 2.88 6.4 6.42s-2.86 6.42-6.4 6.42c-1.78 0-3.38-.73-4.54-1.9l-1.3 1.3c1.5 1.5 3.55 2.43 5.83 2.43 4.58 0 8.28-3.7 8.28-8.25 0-4.56-3.7-8.25-8.26-8.25zM11 8.33v4.6l3.92 2.3.66-1.1-3.2-1.9v-3.9H11z"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewLikedVidsIcon() {
		let container = document.querySelector('#bt-liked-vids-button yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-liked-vids-icon';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#bt-liked-vids-button svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#bt-liked-vids-button yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M3.75 18.75h3v-9h-3v9zm16.5-8.25c0-.83-.68-1.5-1.5-1.5h-4.73l.7-3.43.03-.24c0-.3-.13-.6-.33-.8l-.8-.78L8.7 8.7c-.3.26-.45.64-.45 1.05v7.5c0 .82.67 1.5 1.5 1.5h6.75c.62 0 1.15-.38 1.38-.9l2.27-5.3c.06-.18.1-.36.1-.55v-1.5z"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewExpandIcon() {
		let container = document.querySelector('#bt-show-more-button yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-expand-icon';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#bt-show-more-button:not([expanded]) svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#bt-show-more-button yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewCollapseIcon() {
		let container = document.querySelector('#collapser-item yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-collapse-icon';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#collapser-item svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#collapser-item yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewExpandIcon2() {
		let container = document.querySelector('#bt-show-more-button-2 yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-expand-icon-2';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#bt-show-more-button-2 svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#bt-show-more-button-2 yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createAbove() {
		let container = document.querySelector('ytd-watch-flexy #columns');
		const newElem = document.createElement("div");
		newElem.id = 'bt-above';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		`;
		container.insertBefore(newElem, container.children[0]);
	}
	function createStandardViewCount() {
		let container = document.querySelector('ytd-watch-flexy #above-the-fold #top-row');
		const newElem = document.createElement("div");
		newElem.id = 'bt-view-count';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<span>???,???</span>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createLtoDBar() {
		let container = document.querySelector('ytd-watch-flexy #above-the-fold #top-row');
		const newElem = document.createElement("div");
		newElem.id = 'bt-bar';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		if (!BTConfig.iUseRYD) {
			newElem.setAttribute("title", "Turn on Return YouTube Dislike compatibility in CustomTube settings for like/dislike ratio (Return YouTube Dislike extension required)");
		}
		newElem.innerHTML = `
		<dislikes>
			<likes></likes>
		</dislikes>
		<div id="bt-counts">
			<div id="lcon">
				<span id="lcicon" class="bti"></span>
				<span id="lc" class="btc">??</span>
				<span id="lcs" class="bts"> likes,</span>
			</div>
			<div id="dcon">
				<span id="dcicon" class="bti"></span>
				<span id="dc" class="btc">??</span>
				<span id="dcs" class="bts"> dislikes</span>
			</div>
		</div>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewLikeIcon() {
		let container = document.querySelector('#segmented-like-button yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-like';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#segmented-like-button svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0]);
	}
	function createNewDisLikeIcon() {
		let container = document.querySelector('#segmented-dislike-button yt-icon');
		const newElem = document.createElement("bt-icon");
		newElem.id = 'bt-dislike';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<style>
		#segmented-dislike-button svg:not([icon-type="plmr"s]) {
			display: none !important;
		}
		#segmented-dislike-button yt-icon-shape {
			display: none !important;
		}
		</style>
		<svg class="yt-icon" icon-type="plmr" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false" style="pointer-events: none; display: block; width: 100%; height: 100%;">
			<g class="yt-icon">
				<path class="yt-icon" d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v1.91l.01.01L1 14c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"></path>
			</g>
		</svg>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createPfpUploadDate() {
		let container = document.querySelector('ytd-watch-flexy #upload-info');
		const newElem = document.createElement("div");
		newElem.id = 'bt-pfp-upload-date';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<span id="published-on" style="display: none">Published on </span>
		<span id="precise-upload-date">Getting Upload Date...</span>
		<span id="fuzzy-upload-date" style="display: none"></span>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createMiddleRow() {
		let container = document.querySelector('ytd-watch-flexy #above-the-fold');
		const newElem = document.createElement("div");
		newElem.id = 'bt-middle-row';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
	<style>
	#watch-buttons-inner {
	  display: flex;
	  padding: 4px;
	  margin: 0 10px;
	  margin: 0;
	}
	</style>
	<div id="watch-buttons-inner">
		<div id="left">
		</div>
		<div id="middle">
		</div>
		<div id="middle2">
		</div>
		<div id="right" style="display: none">
			<div id="nostalgic-like-button" class="nostalgic-watch-button" active="false">
				<div id="like-icon">
				</div>
				<span id="nostalgic-like-count">??</span>
			</div>
			<div id="nostalgic-dislike-button" class="nostalgic-watch-button" active="false">
				<div id="dislike-icon">
				</div>
				<span id="nostalgic-dislike-count">??</span>
			</div>
		</div>
	</div>
		`;
		waitFor("html[title-on-top='false']", 100, midRow1);
		waitFor("html[title-on-top='true']", 100, midRow2);
		function midRow1() {
			container.insertBefore(newElem, container.children[1].nextSibling);
		}
		function midRow2() {
			container.insertBefore(newElem, container.children[0].nextSibling);
		}
	}
	function createDescUploadDate() {
		let container = document.querySelector('ytd-watch-flexy #above-the-fold #description-inner');
		const newElem = document.createElement("div");
		newElem.id = 'bt-desc-upload-date';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.innerHTML = `
		<span id="published-on" style="display: none">Published on </span>
		<span id="precise-upload-date">Getting Upload Date...</span>
		<span id="fuzzy-upload-date" style="display: none"></span>
		`;
		container.insertBefore(newElem, container.children[0].nextSibling);
	}
	function createNewShowMoreButton() {
		let container = document.querySelector('ytd-watch-flexy #above-the-fold ytd-text-inline-expander');
		const newElem = document.createElement("button");
		newElem.id = 'bt-show-more';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.setAttribute("onclick", "document.querySelector('ytd-text-inline-expander').setAttribute('is-expanded', '');");
		newElem.innerHTML = `
		Show more
		`;
		container.insertBefore(newElem, container.children[5].nextSibling);
	}
	function createNewShowLessButton() {
		let container = document.querySelector('ytd-watch-flexy #above-the-fold ytd-text-inline-expander');
		const newElem = document.createElement("button");
		newElem.id = 'bt-show-less';
		newElem.setAttribute("class", "bt-universalized-element");
		newElem.setAttribute("bt-optimized-universal-element", "");
		newElem.setAttribute("onclick", "document.querySelector('ytd-text-inline-expander').removeAttribute('is-expanded');");
		newElem.innerHTML = `
		Show less
		`;
		container.insertBefore(newElem, container.children[5].nextSibling);
	}
	/*function createShowMoreHome() {
		let richGrid = document.querySelector('html[location="home"] ytd-two-column-browse-results-renderer[page-subtype="home"] ytd-rich-grid-renderer');
		const loadMore = document.createElement("div");
		loadMore.id = 'bt-load-more-homepage';
		loadMore.setAttribute("bt-optimized-universal-element", "");
		loadMore.setAttribute("class", "bt-universalized-element bt-standard-button");
		loadMore.innerHTML = `
		<a>
			<span>Load More</span>
		</a>
		`;
		richGrid.insertBefore(loadMore, richGrid.children[5].nextSibling);	
		setTimeout(disableInfiScroll, 100);
	}
	function createShowMoreChannel() {
		let richGrid = document.querySelector('html[location="channel"] ytd-two-column-browse-results-renderer[page-subtype="channels"] ytd-rich-grid-renderer');
		const loadMore = document.createElement("div");
		loadMore.id = 'bt-load-more-channel';
		loadMore.setAttribute("bt-optimized-universal-element", "");
		loadMore.setAttribute("class", "bt-universalized-element bt-standard-button");
		loadMore.innerHTML = `
		<a>
			<span>Load More</span>
		</a>
		`;
		richGrid.insertBefore(loadMore, richGrid.children[5].nextSibling);	
		setTimeout(disableInfiScroll2, 100);
	}*/
	function createShowMoreRelated() {
		let related = document.querySelector('html[location="watch"] ytd-watch-flexy #related');
		const loadMore = document.createElement("div");
		loadMore.id = 'bt-load-more-related';
		loadMore.setAttribute("bt-optimized-universal-element", "");
		loadMore.setAttribute("class", "bt-universalized-element");
		if (BTConfig.layoutSelect == "none") {
			loadMore.setAttribute("class", "bt-universalized-element bt-standard-button");	
		}
		if (BTConfig.layoutSelect == "hitchhiker-2014") {
			loadMore.setAttribute("class", "bt-universalized-element bt-standard-button");	
		}
		if (BTConfig.layoutSelect == "hitchhiker-2013-2") {
			loadMore.setAttribute("class", "bt-universalized-element bt-standard-button");	
		}
		if (BTConfig.layoutSelect == "hitchhiker-2013-1") {
			loadMore.setAttribute("class", "bt-universalized-element bt-standard-button");	
		}
		if (BTConfig.layoutSelect == "cosmicpanda-3") {
			loadMore.setAttribute("class", "bt-universalized-element bt-standard-button");	
		}
		if (BTConfig.layoutSelect == "polymer-2019") {
			loadMore.setAttribute("class", "bt-universalized-element bt-standard-button");	
		}
		loadMore.innerHTML = `
		<a>
		<span>Load more
			<span id="suggestions"> suggestions</span>
		</span>
		
		</a>
		`;
		related.insertBefore(loadMore, related.children[2].nextSibling);	
		setTimeout(disableInfiScroll3, 100);
	}
}
function moveElements() {
	waitFor("html[watch-metadata-style^='hitchhiker's] ytd-watch-flexy #above-the-fold #top-level-buttons-computed ytd-button-renderer", 100, prepFor);
	waitFor("html[watch-metadata-style^='cosmicpanda'][title-on-top='false'] ytd-watch-flexy #above-the-fold #top-level-buttons-computed ytd-button-renderer", 100, prepFor);
	waitFor("html[title-on-top='true'] ytd-watch-flexy #bt-above", 100, moveTitleToTop);
	waitFor("html[location='watch'][watch-metadata-style^='hitchhiker-2013'] ytd-watch-flexy", 100, moveGuideButton);
	function prepFor() {
	waitFor("#bt-middle-row", 100, moveWatchButtons);
	}
	function moveWatchButtons() {
		var flexMenu = document.querySelector("ytd-menu-renderer.ytd-watch-metadata");
		flexMenu.setAttribute("has-items", "5");
		var flexItems = document.querySelector('#above-the-fold ytd-menu-renderer #flexible-item-buttons');
		let share = document.querySelector("ytd-watch-flexy #above-the-fold #top-level-buttons-computed ytd-button-renderer button");
		let share1 = share.parentNode;
		let shareButton = share1.parentNode;
		shareButton.setAttribute("id", "bt-share-button");
		var moreButton = document.querySelector('#above-the-fold ytd-menu-renderer #button-shape');
		var newHome1 = document.querySelector('#bt-middle-row #watch-buttons-inner #left');
		var newHome2 = document.querySelector('#bt-middle-row #watch-buttons-inner #middle');
		var newHome3 = document.querySelector('#bt-middle-row #watch-buttons-inner #middle2');
		if (!tasks.moveHHButtons) {
			newHome1.appendChild(flexItems);
			newHome2.appendChild(shareButton);
			newHome3.appendChild(moreButton);
		}
		waitFor("#bt-middle-row", 100, verifyHHMeta);
		function verifyHHMeta() {
			if (shareButton === null) {
				tasks.moveHHButtons = true;
			}
			if (shareButton !== null){
				tasks.moveHHButtons = false;
				moveWatchButtons();
			}
		}
	}
	function moveTitleToTop() {
		var title = document.querySelector('#above-the-fold #title');
		var topRow = document.querySelector('#above-the-fold #owner');
		var newHome4 = document.querySelector('#bt-above');
		newHome4.appendChild(title);
		newHome4.appendChild(topRow);
	}
	function moveGuideButton() {
		var theBtn = document.querySelector('#guide-button');
		theBtn.setAttribute('onclick','document.querySelector("#guide").setAttribute("persistent",""); document.querySelector("ytd-watch-flexy").toggleAttribute("guide");');
		var newHome5 = document.querySelector('ytd-watch-flexy');
		newHome5.appendChild(theBtn);
	}
}
function watchPageEveryLoad() {
	if (BTVars.btlocation == "watch") {
		// get subbtn 
		waitFor("ytd-watch-flexy ytd-subscribe-button-renderer[subscribe-button-hidden]", 200, markSubbed);
		waitFor("ytd-watch-flexy ytd-subscribe-button-renderer:not([subscribe-button-hidden])", 200, markUnsubbed);
		// Video Title
		var videoTitle = document.querySelector("ytd-watch-flexy #title h1 .style-scope.ytd-watch-metadata").textContent;
		// View Count and Upload Date
		var trueCounts = document.querySelector("#above-the-fold #description #tooltip").textContent;
		// View Count
		var cutString = trueCounts.split(' • ');
		var trueViewCount = cutString[0];
		var cutString2 = trueViewCount.split(' v');
		var trueViewCountTrimmed = cutString2[0];
		waitFor("#bt-view-count", 200, doViews);
		function doViews() {
		if (!BTVars.trimViews) {
			document.querySelector("#bt-view-count span").textContent = trueViewCount;
		}
		if (BTVars.trimViews) {
			document.querySelector("#bt-view-count span").textContent = trueViewCountTrimmed;
		}
		}
		// Upload Date
		var trueUploadDate = cutString[1];
		let notNeedNewString = trueUploadDate.includes("d");
		if (notNeedNewString == true) {
		  document.querySelector("#bt-desc-upload-date #published-on").style.display = "none";	
		  document.querySelector("#bt-pfp-upload-date #published-on").style.display = "none";	
		}
		if (notNeedNewString == false) {
		  document.querySelector("#bt-desc-upload-date #published-on").style.display = "inline";	
		  document.querySelector("#bt-pfp-upload-date #published-on").style.display = "inline";
		}
		document.querySelector("#bt-desc-upload-date #precise-upload-date").innerText = trueUploadDate;
		document.querySelector("#bt-pfp-upload-date #precise-upload-date").innerText = trueUploadDate;
		if (BTConfig.iUseRYD) {
			waitFor("#segmented-dislike-button .yt-spec-button-shape-next--button-text-content span", 200, doCounts);
		}
		if (!BTConfig.iUseRYD) {
			waitFor("#segmented-like-button .yt-spec-button-shape-next--button-text-content span", 200, doCounts);
		}
		function doCounts() {
			let likeCount = document.querySelector("#segmented-like-button .yt-spec-button-shape-next--button-text-content span").textContent;
			document.querySelector("#lc").innerText = likeCount;
			if (BTConfig.iUseRYD) {
				let dislikeCount = document.querySelector("#segmented-dislike-button .yt-spec-button-shape-next--button-text-content span").textContent;
				document.querySelector("#dc").innerText = dislikeCount;
			}
		}
		/* sub counts */
		waitFor("html[location='watch'] #owner-sub-count", 200, trimSubs);
		function trimSubs() {
			var subCountElem = document.querySelector("#owner-sub-count");
			var subCount = subCountElem.getAttribute("aria-label");
			var cutSubString = subCount.split('s');
			var trimmedSubCountt = cutSubString[0];
			if (trimmedSubCountt.includes("mi")) {
				var cutSubString2 = trimmedSubCountt.split(' m');
				var cutSubString3 = cutSubString2[0] + "M";
				var trimmedSubCount = cutSubString3;
			}
			if (!trimmedSubCountt.includes("mi")) {
				var trimmedSubCount =  trimmedSubCountt;
			}
			if (BTConfig.layoutSelect == "hitchhiker-2017") {
			document.querySelector("#owner-sub-count").innerText = trimmedSubCount;
			}
			if (BTConfig.layoutSelect == "hitchhiker-2016") {
			document.querySelector("#owner-sub-count").innerText = trimmedSubCount;
			}
			if (BTConfig.layoutSelect == "hitchhiker-2015") {
			document.querySelector("#owner-sub-count").innerText = trimmedSubCount;
			}
			if (BTConfig.layoutSelect == "hitchhiker-2014") {
			document.querySelector("#owner-sub-count").innerText = trimmedSubCount;
			}
			if (BTConfig.layoutSelect == "hitchhiker-2013-2") {
			document.querySelector("#owner-sub-count").innerText = trimmedSubCount;
			}
			if (BTConfig.layoutSelect == "hitchhiker-2013-1") {
			document.querySelector("#owner-sub-count").innerText = trimmedSubCount;
			}
			waitFor("html[sub-button-nested-sub-count='true']", 1, doButtonNestedCount);
			function doButtonNestedCount() {
				document.querySelector("html[location='watch'] ytd-watch-flexy #subscribe-button yt-button-shape span").innerText = "Subscribe " + " " + trimmedSubCount;
				document.querySelector("html[location='watch'] ytd-watch-flexy #subscribe-button #notification-preference-button yt-button-shape span").innerText = "Subscribed " + " " + trimmedSubCount;
			}
		}

		waitFor("html:not([no-ryd]) #segmented-dislike-button span", 1000, getRydCounts);
		function getRydCounts() {
			var rydPercent =  document.querySelector("#ryd-bar").style.width;
			document.querySelector("#bt-bar likes").style.width = rydPercent;
			document.querySelector("#bt-bar").setAttribute("title", rydPercent + " of viewers like this video");
		}
		}

	tasks.appliedWatchMetadata = "true";
}
var repeatedActions = setInterval(function()
{
	if (document.querySelector('ytd-watch-flexy[fullscreen]') != null) {
		BTVars.playerState = "fullscreen";
	}
	if (document.querySelector('ytd-watch-flexy[theater]') != null) {
		BTVars.playerState = "theater";
	}
	if (document.querySelector('ytd-watch-flexy[theater]') == null) {
		if (document.querySelector('ytd-watch-flexy[fullscreen]') == null) {
			BTVars.playerState = "normal";
		}
	}
	// Different styling is needed if the "Subscribed" button is shown instead of the "Subscribe" button. So we check every 2 seconds to see if either button is currently visible. 
	// This causes a weird issue with Devtools though, where text gets deselected every 2 seconds. Dev Mode makes it so that we only check on new page load and fixes this issue, but that isn't ideal for regular use so that's why we have Dev Mode. 
	if (!BTConfig.devMode) {
		waitFor("ytd-watch-flexy ytd-subscribe-button-renderer[subscribe-button-hidden]", 2000, markSubbed);
		waitFor("ytd-watch-flexy ytd-subscribe-button-renderer:not([subscribe-button-hidden])", 2000, markUnsubbed);
	}
	if (BTConfig.blockRGW) {
		waitFor("ytd-rich-grid-watch", 100, blockRGW);
		function blockRGW() {
			console.log("[CustomTube] Rich Grid Watch Detected. Reloading.");
			window.location.reload();
		}
	}
}, 2000);
/* Disabled. May look into fixing it in the future
function disableInfiScroll() {
  	let loadMoreVids = document.querySelector('ytd-two-column-browse-results-renderer[page-subtype="home"] #bt-load-more-homepage a');
	loadMoreVids.onclick = function() {
	document.querySelector("ytd-two-column-browse-results-renderer[page-subtype='home'] ytd-continuation-item-renderer").style.display = "block";
	}
}
function disableInfiScroll2() {
  	let loadMoreVids2 = document.querySelector('ytd-two-column-browse-results-renderer[page-subtype="channels"] #bt-load-more-channel a');
	loadMoreVids2.onclick = function() {
	document.querySelector("ytd-two-column-browse-results-renderer[page-subtype='channels'] ytd-continuation-item-renderer").style.display = "block";
	}
}*/
function disableInfiScroll3() {
  	let loadMoreVids3 = document.querySelector('html[location="watch"] ytd-watch-flexy #related #bt-load-more-related a');
	loadMoreVids3.onclick = function() {
	document.querySelector("html[location='watch'] ytd-watch-flexy #related ytd-continuation-item-renderer").style.display = "block";
	setTimeout(disableInfiScroll3point5, 1000);
	}
}
function disableInfiScroll3point5() {
	//document.querySelector("ytd-app[location='watch'] ytd-watch-flexy #related ytd-continuation-item-renderer").style.display = "none";
	document.querySelector("ytd-app").setAttribute("can-infi-scroll-related", "no");
}
//watch page subbtn
function markSubbed() {
	document.querySelector("html").setAttribute("subscribed","true");
}
function markUnsubbed() {
	document.querySelector("html").setAttribute("subscribed","false");
}
