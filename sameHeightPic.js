/*
【1】//创建实例 
//box 为图片盒子，standHeight 为设置基准高度。gap为图片间间隙
var picsObj = new PicList(box,standHeight,gap) 


【2】添加图片；
    picUrls 为图片地址数组,  true表示清空后插入，false（默认）为在box里追加。 after可选，为插入图片后的回调。 

    picsObj.addPics(picUrls,true).after(function(wraps){// wraps 为图片的父级div数组 })
    
【3】//box清空图片
    picsObj.clearPics()

【4】//销毁, box 未清空
    picsObj.destory()
*/


function PicList(box, standHeight, gap) {
    var self = this;
    self.pics = []; //已插入box 的图片
    self.standHeight = parseInt(standHeight || 150);
    self.box = box;
    self.gap = parseInt(gap || 10);
    self.boxWidth = self.getCoWidth(box);
    self.lefts = [];

    self.queues = [];

    self.maxWidth = 500;//长图阈值。
    function resize() {
        self.readysResize();
    }
    addEvent(window, 'resize', resize)
    self.resize = resize;
}
PicList.prototype.addPics = function(picUrls, isClear) {
    var self = this;
    var pics = [];
    var picChecks = [];
    if (isClear) {
        self.clearPics();
    }
    var queueObj = { timer: null, over: false, pics: [], picWraps: [] }
    self.queues.push(queueObj);

    picUrls.forEach(function(url, index) {
        var image = document.createElement('img');
        image.src = url;
        pics.push(image);
        picChecks.push(image);
        image.onerror = function() {
            picChecks.forEach(function(img, index) {
                if (img == image) {
                    picChecks.splice(index, 1);
                }
            })
            pics.forEach(function(img, index) {
                if (img == image) {
                    pics.splice(index, 1);
                }
            })
        }
    })

    // 定时执行获取宽高
    function check() {
        if (!picChecks.length) {

            queueObj.over = true; //图片已就绪，等待插入
            queueObj.pics = pics;

            self.excuteQueue();

            return;
        } else {
            picChecks.forEach(function(img, index) {
                if (img.width > 0 || img.height > 0) { // 只要任何一方大于0,表示已经服务器已经返回宽高
                    img.ogRate = img.width / img.height;
                    img.ogWidth = img.width;
                    img.ogHeight = img.height;
                    picChecks.splice(index, 1);
                }
            })
            queueObj.timer = setTimeout(check, 40);
        }
    }
    check();
    return {
        after: function(fn) {
            if (fn) {
                queueObj.fn = fn;
            }
        }
    }
};
PicList.prototype.excuteQueue = function() {
    var self = this;
    var next = false;
    self.queues.forEach(function(queueObj, index) {
        if (index == 0 && queueObj.over) {
            self.readys(queueObj); //插入box
            queueObj.fn && queueObj.fn(queueObj.picWraps); //执行回调;
            self.readysResize(self.pics); // 防止撑出滚动条，需重新监测
            next = true;
        } else {
            return;
        }
    })
    if (next) {
        self.queues.shift();
        self.excuteQueue()
    }
}

PicList.prototype.getCoWidth = function(obj) {
    return obj.clientWidth - 2 // 修正clientWidth宽度
}
PicList.prototype.clearPics = function() {
    var self = this;
    self.box.innerHTML = '';
    self.pics = [];
    self.lefts = [];
    self.queues.forEach(function(queueObj) {
        clearTimeout(queueObj.timer)
    })
    self.queues = [];
    self.boxWidth = self.getCoWidth(box);
}

PicList.prototype.destory = function() {
    var self = this;
    self.pics = [];
    self.lefts = [];
    self.queues.forEach(function(queueObj) {
        clearTimeout(queueObj.timer)
    })
    self.queues = [];

    self.addPics = null;
    self.boxWidth = self.getCoWidth(box);
    window.remveEventListener('resize', self.resize);
}

PicList.prototype.readys = function(queueObj) {
     var self = this;   
    var pics = []


    queueObj.pics.forEach(function(pic) { //对拷贝数组做修改。原pics数组不被修改。
        self.pics.push(pic); //将该组的pics 插入实例的pics 中。
        pics.push(pic);
    })

    for (var i = 0, length = self.lefts.length; i < length; i++) { //添加上次残留
        pics.unshift(self.lefts[length - i - 1]);
    }


    var standHeight = self.standHeight;
    var boxWidth = self.getCoWidth(self.box); //内容宽
    pics.forEach(function(pic) {
        if (pic.ogWidth < standHeight || pic.ogHeight < standHeight) {
            pic.wRate = 1;
            pic.noScale = true;
        } else {
            pic.wRate = pic.ogRate;
            pic.noScale = false;
        }

        var width = pic.wRate * standHeight;

        if (width < 100) {
            pic.noScale = true;
            width = 100;
            pic.wRate = width / standHeight;
        }

        if (width > self.maxWidth) {
            width = self.maxWidth
            pic.wRate = width / standHeight;
        }

        pic.wWidth = width;
        pic.wHeight = pic.wWidth / pic.wRate;

    })


    var temp = [];
    var totalWidh = 0;

    pics.forEach(function(pic) {
        totalWidh += (pic.wWidth + self.gap);
        if (totalWidh > boxWidth) {

            if(temp.length==1&& temp[0].noScale&&temp[0].wWidth<(2*boxWidth/3)){ // 一张小图 和长图碰撞，则放一行。防止只有小图占一行导致布局丑陋

                pic.wWidth = boxWidth-  temp[0].wWidth - 2*self.gap;

                temp =[];
                totalWidh =0;

            }else{
                var rate = (totalWidh - pic.wWidth - self.gap - temp.length * self.gap) / (boxWidth - temp.length * self.gap);

                temp.forEach(function(item) {
                    item.wWidth = item.wWidth / rate;
                    item.wHeight = item.wWidth / item.wRate;
                })

                temp = [pic];
                totalWidh = pic.wWidth + self.gap;

            }

            return;
        } else {
            temp.push(pic);
        }
    })

    for (var i = 0, length = self.lefts.length; i < length; i++) { // 移出上次残留, 并且设置父级的宽高
        pics.shift();
        var item = self.lefts[i];
        item.parentNode.style.maxWidth = self.boxWidth - self.gap + 'px'
        item.parentNode.style.width = item.wWidth + 'px';
        item.parentNode.style.height = item.wHeight + 'px';
        item.parentNode.style.lineHeight = item.wHeight + 'px';
    }

    self.lefts = [];
    temp.forEach(function(pic) { //更新本次残留
        self.lefts.push(pic)
    })

    pics.forEach(function(pic) {
        var wrap = document.createElement('div');
        wrap.appendChild(pic);       
        wrap.style.display = "inline-block";
        wrap.style.textAlign ="center";
        wrap.style.verticalAlign = "top";
        wrap.style.padding = self.gap / 2 + 'px';
        wrap.style.width = pic.wWidth + 'px';
        wrap.style.height = pic.wHeight + 'px';
        wrap.style.lineHeight = pic.wHeight + 'px';
        wrap.style.maxWidth = self.boxWidth - self.gap + 'px'
        wrap.style.fontSize = '0px';
        pic.style.verticalAlign = "middle";
        pic.style.maxWidth = '100%';
        pic.style.maxHeight = '100%';

        self.box.appendChild(wrap);
        queueObj.picWraps.push(wrap);
    })
}

PicList.prototype.readysResize = function() {

    var self = this;
   
    if (!self.pics.length) {
        return;
    }
    var width = self.getCoWidth(self.box);
    
    if (width !== self.boxWidth) {
        self.boxWidth = width;
        var pics = self.pics;
        var standHeight = self.standHeight;
        var boxWidth = self.boxWidth; //内容宽

        pics.forEach(function(pic) {
            var width = pic.wRate * standHeight;
            pic.wWidth = width;
            pic.wHeight = pic.wWidth / pic.wRate;
        })
        var temp = [];
        var totalWidh = 0;
        pics.forEach(function(pic) {
            totalWidh += (pic.wWidth + self.gap);
            if (totalWidh > boxWidth) {

                if(temp.length==1&& temp[0].noScale&&temp[0].wWidth<(2*boxWidth/3)){

                    pic.wWidth = boxWidth-  temp[0].wWidth - 2*self.gap;
                    temp.push(pic);

                    temp.forEach(function(item) {
                        item.parentNode.style.maxWidth = self.boxWidth - self.gap + 'px';
                        item.parentNode.style.width = item.wWidth + 'px';
                        item.parentNode.style.height = item.wHeight + 'px';
                        item.parentNode.style.lineHeight = item.wHeight + 'px';
                    })
                    temp =[];
                    totalWidh =0;

                }else{
                    var rate = (totalWidh - pic.wWidth - self.gap - temp.length * self.gap) / (boxWidth - temp.length * self.gap);

                    temp.forEach(function(item) {
                        item.wWidth = item.wWidth / rate;
                        item.wHeight = item.wWidth / item.wRate;
                        item.parentNode.style.maxWidth = self.boxWidth - self.gap + 'px';
                        item.parentNode.style.width = item.wWidth + 'px';
                        item.parentNode.style.height = item.wHeight + 'px';
                        item.parentNode.style.lineHeight = item.wHeight + 'px';
                    })

                    temp = [pic];
                    totalWidh = pic.wWidth + self.gap;                
                }
                return;
            } else {
                temp.push(pic);
            }
        })
        self.lefts = [];
        temp.forEach(function(pic) { //更新本次残留
            self.lefts.push(pic)
            pic.parentNode.style.maxWidth = self.boxWidth - self.gap + 'px'
            pic.parentNode.style.width = pic.wWidth + 'px';
            pic.parentNode.style.height = pic.wHeight + 'px';
            pic.parentNode.style.lineHeight = pic.wHeight + 'px';
        })
        var width = self.getCoWidth(self.box);
        if(self.boxWidth<width){
            self.boxWidth = width;
        }else{
            self.readysResize();
        }
    }else{
        return;
    }
}

if (!Array.prototype.forEach) {

    Array.prototype.forEach = function forEach(callback, thisArg) {

        var T, k;

        if (this == null) {
            throw new TypeError("this is null or not defined");
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if (typeof callback !== "function") {
            throw new TypeError(callback + " is not a function");
        }
        if (arguments.length > 1) {
            T = thisArg;
        }
        k = 0;

        while (k < len) {

            var kValue;
            if (k in O) {

                kValue = O[k];
                callback.call(T, kValue, k, O);
            }
            k++;
        }
    };
}

function addEvent(obj, sEv, fn) {
    if (obj.addEventListener) {
        obj.addEventListener(sEv, fn, false);
    } else {
        obj.attachEvent('on' + sEv, function() { //此函数this 指向window
            fn.call(obj);
        });
        //obj.attachEvent('on'+sEv, fn);
    }
}


function getScrollWidth() {
  var noScroll, scroll, oDiv = document.createElement("DIV");
  oDiv.style.cssText = "position:absolute; top:-1000px; width:100px; height:100px; overflow:hidden;";
  noScroll = document.body.appendChild(oDiv).clientWidth;
  oDiv.style.overflowY = "scroll";
  scroll = oDiv.clientWidth;
  document.body.removeChild(oDiv);
  return noScroll-scroll;
}