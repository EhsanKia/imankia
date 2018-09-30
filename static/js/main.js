var app = angular.module('ImanApp', []);

app.filter('page', function(){
	return function(input, ppp, page) {
		if (!input) return;
		return input.slice(page*ppp, (page+1)*ppp);
	};
});

app.filter('tagFilter', function(){
	return function(input, tag){
		if (!input) return [];
		if (!tag) return input;
		return input.filter(function(p){
			return p.tags && p.tags.indexOf(tag) >= 0;
		});
	};
});

app.directive('postsLoop', function () {
	return {
		link: function (scope) {
			scope['opened_'+scope.p.id] = 0;
		}
	};
});

function ImanCtrl($scope, $http, $location, $filter, $timeout){
	$scope.FRONT_IMAGES = cover_images;

	$scope.MONTH = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
	$scope.PAGES = ['home','blog','portfolio','about','contact'];
	$scope.PPP = 8;

	$scope.toggleTag = function(e, tag){
		$scope.blogPage = 0;
		var target = e.target.nodeName === "SPAN" ? e.target.parentNode : e.target;
		if ($scope.last_target) $scope.last_target.classList.remove("selected");
		if (target === $scope.last_target){
			$scope.tag = "";
			$scope.last_target = null;
		}
		else{
			target.classList.add("selected");
			$scope.tag = tag;
			$scope.last_target = target;
		}
	};

	$scope.toggle = function(n, e){
		if (e !== undefined) e.preventDefault();
		var el = document.getElementById('post'+n);
		var b, buttons = el.parentNode.parentNode.getElementsByClassName('readmore');
		if (buttons[0].style.display === "none") b = buttons[1];
		else b = buttons[0];

		if (b.click === undefined){
			var clickEvent = document.createEvent('MouseEvents');
			clickEvent.initMouseEvent('click', true, true, window);
			$timeout(function(){b.dispatchEvent(clickEvent);});
		}
		else
			$timeout(function(){b.click();});

	};

	$scope.open = function(n){
		var el = document.getElementById('post'+n);
		el.parentNode.style.maxHeight = el.offsetHeight + "px";
		stButtons.locateElements();
	};

	$scope.close = function(n){
		var el = document.getElementById('post'+n);
		el.parentNode.style.maxHeight = "80px";
	};

	$scope.range = function(n) {
		var list = [];
		for (var i = 0; !!n && i < Math.ceil(n); i++)
			list.push(i);
		return list;
	};

	$scope.blogPage = 0;
	$scope.setBlogPage = function(p){
		smoothScrollTo(0, 500);
		if (typeof(posts) !== "undefined") posts.style.opacity = 0;
		$timeout(function(){$scope.blogPage = p;}, 500);
		$timeout(function(){
			if (typeof(posts) !== "undefined") posts.style.opacity = 1;
		}, 600);
	};

	$scope.getPost = function(id){
		for (var i = 0; i < $scope.posts.length; i++)
			if ($scope.posts[i].id === id)
				return $scope.posts[i];
	};

	$scope.getPostPage = function(id){
		for (var i = 0; i < $scope.posts.length; i++)
			if ($scope.posts[i].id === id)
				return Math.floor(i/$scope.PPP);
	};

	$scope.goToPost = function(id){
		if (!$scope.dataLoaded || !$scope.fontLoaded){
			setTimeout(function(){$scope.goToPost(id);}, 50);
			return;
		}

		$scope.blogPage = $scope.getPostPage(id);
		if (!$scope.$$phase) $scope.$apply();
		var el = document.getElementById('post'+id);
		smoothScrollTo(el.offsetTop - 80, 500);
		$scope.toggle(id);
	};

	$scope.goToArt = function(id){
		if (!$scope.artLoaded){
			setTimeout(function(){$scope.goToArt(id);}, 50);
			return;
		}

		for (var i=0; i < $scope.arts.length; i++){
			if (clean($scope.arts[i].title) === id){
				$scope.activeArt = i;
				$location.path('/portfolio/'+id);
				break;
			}
		}
	};

	$scope.parse = function(data){
		if (!data) return;
		data = data.replace(/\n/g,'<br>');
		data = data.replace(/\*\*(.*?)\*\*/g,"<b>$1</b>");
		data = data.replace(/\*(.*?)\*/g,"<i>$1</i>");
		data = data.replace(/&&(.*?)&&/g,"<span class='opensans'>$1</span>");
		data = data.replace(/\[sp=(.*?)\]/g,'<img class="small" src="/static/img/s/$1" onclick="expand(this, \'$1\')">');
		data = data.replace(/\[lp=(.*?)\]/g,'<img src="/static/img/m/$1" onclick="expand(this, \'$1\')">');
		data = data.replace(/\[yt=(.*?)\]/g,'<iframe width="700" height="525" src="http://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe>');
		data = data.replace(/\[vimeo=(.*?)\]/g,'<iframe width="700" height="525" src="//player.vimeo.com/video/$1" frameborder="0" allowfullscreen></iframe>');
		data = data.replace(/\[gfycat=(.*?)\]/g,'<img class="gfyitem" data-id="$1" data-controls="false" data-dot="false"/>');
		data = data.replace(/\[(.*?)\]\((.*?)\)/g,"<a href='$2' target='_blank'>$1</a>");
		data = data.replace(/\{(.*?)\}/g,"<div style='text-align:center'>$1</div>");
		gfyCollection.init();
		return data;
	};

	$scope.goToPage = function(page){
		$scope.currentPage = page;
		$scope.setBlogPage(0);
		$scope.activeArt = -1;
		$scope.tag = "";
		if ($scope.last_target){
			$scope.last_target.classList.remove("selected");
			$scope.last_target = null;
		}
	};

	$scope.currentCover = -1;
	$scope.nextFrontCover = function(){
		if ($scope.prom) $timeout.cancel($scope.prom);

		$scope.currentCover = ($scope.currentCover + 1) % $scope.FRONT_IMAGES.length;
		$scope.prom = $timeout(function(){
			if ($scope.currentPage === 'home')
				$scope.nextFrontCover();
		}, 5000);
	};

	$scope.contact = {
		name: "",
		email: "",
		message: "",
		submit: "Submit Message",
		sending: false
	};

	$scope.sendEmail = function(){
		$scope.contact.sending = true;
		$scope.contact.submit = "Sending...";

		var postData = {
			name: $scope.contact.name,
			email: $scope.contact.email,
			message: $scope.contact.message,
		};

		var request = {
			url: 'https://script.google.com/macros/s/AKfycbymFIHDdybdAd0P4Nm7ox5v8xWSEF-SfNelzVCtdAjlZBV8wD0/exec',
			data: postData,
			method : 'POST',
			transformRequest: (obj) => {
				var str = [];
				for(var p in obj) str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
				return str.join("&");
			},
			headers: {
        		"Content-Type": "application/x-www-form-urlencoded"
    		},
		};

		$http(request).success((data) => {
			if (!data.success)
				$scope.contact.submit = data.error;
			else{
				$scope.contact.submit = "Message Sent";
				$scope.contact.name = "";
				$scope.contact.email = "";
				$scope.contact.message = "";
			}

			$timeout(() => {
				$scope.contact.sending = false;
				$scope.contact.submit = "Submit Message";
			}, 5000);
		}).error((data) => {
			console.log(data);
		});
	};

	$scope.firstPath = true;
	$scope.$watch(function() {
		return $location.path();
	}, function(path) {
		var parts = path.split('/');
		if ($scope.PAGES.indexOf(parts[1]) >= 0)
			$scope.currentPage = parts[1];
		else
			$scope.currentPage = 'home';

		if (parts[1] === 'blog' && !!parts[2]){
			if (parts[2][0] === 'p')
				$scope.goToPost(parseInt(parts[2].substr(1), 10));
			else
				$scope.blogPage = parseInt(parts[2], 10)-1;
		}

		if (parts[1] === 'portfolio' && !!parts[2] && $scope.firstPath) {
			$scope.goToArt(parts[2]);
		}

		$scope.firstPath = false;
	});

	$scope.$watch('blogPage', function(){
		if ($scope.currentPage === 'blog')
			$location.path('/blog/'+($scope.blogPage+1));
	});

	$scope.$watch('currentPage', function(newPage){
		document.title = "Iman Kia :: " + newPage.charAt(0).toUpperCase() + newPage.substr(1).toLowerCase();
		if (newPage === 'blog') newPage += '/' + ($scope.blogPage+1);
		if (newPage === 'home') $scope.nextFrontCover();
		$location.path('/'+newPage);
		ga('send', 'pageview', '/'+newPage);
	});

	$http.get('/static/posts.json').success(function(data){
		$scope.posts = $filter('orderBy')(data, function(p){return p.id;}, true);
		$scope.dataLoaded = true;

		$scope.TAGS = [];
		for (var i = 0; i < $scope.posts.length; i++) {
			if ($scope.posts[i].tags){
				for (var j = 0; j < $scope.posts[i].tags.length; j++) {
					var t = $scope.posts[i].tags[j];
					if ($scope.TAGS.indexOf(t) < 0)
						$scope.TAGS.push(t);
				}
			}
		}
	});

	$scope.activeArt = -1;
	$http.get('/static/arts.json').success(function(data){
		$scope.arts = $filter('orderBy')(data, function(p){return -p.id;}, false);
		for (var i = $scope.arts.length - 1; i >= 0; i--) {
			if ($scope.arts[i].id === 12) $scope.arts[i].hidden = true;
		}
		$scope.artLoaded = true;
	});

	$scope.openArt = function(ind) {
		$scope.activeArt = ind;
		if (ind >= 0 && ind < $scope.arts.length) {
			$location.path('/portfolio/'+clean($scope.arts[ind].title));
			setTimeout(function(){window.scrollTo(0, 0);}, 500);
		} else {
			$location.path('/portfolio');
		}
	};
}

var spinner_opts = {
  lines: 9, // The number of lines to draw
  length: 0, // The length of each line
  width: 9, // The line thickness
  radius: 16, // The radius of the inner circle
  corners: 1, // Corner roundness (0..1)
  rotate: 0, // The rotation offset
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: '#000', // #rgb or #rrggbb or array of colors
  speed: 1, // Rounds per second
  trail: 100, // Afterglow percentage
  shadow: false, // Whether to render a shadow
  hwaccel: false, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  top: 'auto', // Top position relative to parent in px
  left: 'auto' // Left position relative to parent in px
};

function clean(text){
	return text.replace(/ /g, '_').replace(/\W/g, '');
}

function expand(el, i){
	var x = parseInt(el.offsetLeft - window.scrollX, 10) - 3;
	var y = parseInt(el.offsetTop - window.scrollY, 10) - 3;

	var img = el.cloneNode();
	var img2 = new Image();
	var loader = new Spinner(spinner_opts).spin();
	loader.el.style.position = "absolute";
	loader.el.style.top = "50%";
	loader.el.style.left = "50%";
	loader.el.style.marginLeft = "10px";
	loader.el.style.zIndex = "95";
	loader.el.style.opacity = "0";
	loader.el.style.transition = "opacity 0.5s";
	setTimeout(function(){loader.el.style.opacity = "1";}, 300);

	var div = document.createElement("div");
	div.appendChild(img);
	div.appendChild(loader.el);
	div.appendChild(img2);

	img.style.top = y + "px";
	img.style.left = x + "px";
	img.style.width = el.width + "px";
	img.style.height = el.height + "px";

	div.classList.add("popup-div");
	img.classList.add("popup-img");
	img2.classList.add("popup-img2");

	document.body.appendChild(div);

	div.onclick = img.onclick = img2.onclick = function(){
		enable_scroll();
		div.style.opacity = "0";
		setTimeout(function(){
			document.body.removeChild(div);
		}, 500);
	};

	document.onkeydown = function(e){
		if (e.keyCode !== 27) return;
		enable_scroll();
                div.style.opacity = "0";
                setTimeout(function(){
                        document.body.removeChild(div);
                }, 500);
	};

	var ar = el.width / el.height;
	var newWidth = parseInt(Math.min(window.innerWidth, window.innerHeight * ar) * 0.8, 10);
	var newHeight = parseInt(newWidth / ar, 10);
	var newTop = parseInt(window.innerHeight - newHeight, 10)/2;
	var newLeft = parseInt(window.innerWidth - newWidth, 10)/2;

	setTimeout(function(){
		div.style.backgroundColor = "rgba(0,0,0,0.5)";
		img2.style.top = img.style.top = newTop + "px";
		img2.style.left = img.style.left = newLeft + "px";
		img2.style.width = img.style.width = newWidth + "px";
		img2.style.height = img.style.height = newHeight + "px";
	}, 0);

	setTimeout(function(){
		img2.onload = function(){img2.style.opacity = "1";};
		img2.src = '/static/img/b/'+i;
	}, 500);

	disable_scroll();
}

function wheel(e) {
  var ev = e || window.event;
  if (ev.preventDefault)
      ev.preventDefault();
  ev.returnValue = false;
  return false;
}

window.onload = function(){
	window.addEventListener("scroll", activateHeader);
	window.addEventListener('DOMMouseScroll', activateHeader, false);
};

var lastPos = 0;
function activateHeader() {
	var el = document.getElementById("header2");
	if (lastPos < window.scrollY && window.scrollY < 700){
		el.classList.add("open");
	} else if (lastPos > window.scrollY && window.scrollY > 100){
		el.classList.add("open");
	} else {
		el.classList.remove("open");
	}
	lastPos = window.scrollY;
}

function disable_scroll() {
  if (window.addEventListener)
      window.addEventListener('DOMMouseScroll', wheel, false);
  window.onmousewheel = document.onmousewheel = wheel;
}

function enable_scroll() {
    if (window.removeEventListener)
        window.removeEventListener('DOMMouseScroll', wheel, false);
    window.onmousewheel = document.onmousewheel = null;
}

window.smoothScrollTo = (function () {
	var timer, start, factor;
	return function (target, duration) {
		var offset = window.pageYOffset,
			delta  = target - window.pageYOffset; // Y-offset difference
		duration = duration || 1000;              // default 1 sec animation
		start = Date.now();                       // get start time
		factor = 0;

		if(timer) clearInterval(timer); // stop any running animations

		function step() {
			var y;
			factor = (Date.now() - start) / duration;  // get interpolation factor
			if( factor >= 1 ) {
				clearInterval(timer);  // stop animation
				factor = 1;  // clip to max 1.0
			}
			y = factor * delta + offset;
			window.scrollBy(0, y - window.pageYOffset);
		}

		timer = setInterval(step, 10);
		return timer;
	};
}());
