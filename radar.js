document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('.radar').forEach(function (element) {
        var radar = new Radar();
        radar.init(element);
        radar.render();
    });
}, false);


function Radar() {

    this.size = 800; //window.innerWidth / 2;
    this.padding = 50;
    this.draw = undefined;
    this.element = undefined;

    this.db = undefined;
    this.radar = undefined;

    this.init = function (element) {

        this.element = element;
        this.draw = SVG(element).size(this.size, this.size);
        this.size -= this.padding;

        this.loadData();

        var link = document.createElement('A');
        link.appendChild(document.createTextNode('Admin'));
        link.title = this.db.url;
        link.href = this.db.url;
        link.target = 'blank';
        this.element.parentNode.appendChild(link);

        document.title = this.radar.title;

        this.drawBackground();
    };

    this.loadData = function() {
        $.ajaxSetup().async = false;

        this.db = new restdb("592d79a430b19d4b2a111b3f", {});
        this.db.radars.find({name: this.element.getAttribute('data-src')}, {}, function (err, radars) {
            if (!err) {
                this.radar = radars[0];
            }
        }.bind(this));
    };

    this.drawBackground = function () {
        var space = (this.size / 4),
            bgColor = 'rgba(88, 88, 88, 0.6)';

        for (var i = 1; i < 5; i++) {
            var size = i * (space) - this.padding;
            this.draw.circle(size).move((this.size / 2) - (size / 2), (this.size / 2) - (size / 2)).fill('transparent').stroke(bgColor);
            this.draw
                .text("Zone " + i)
                .addClass('bg-label')
                .center((this.size / 2) - 8, (this.size / 2) + (size / 2) - 25)
                .rotate(-90);
        }

        var halfSize = (this.size / 2);
        this.draw.line(0, halfSize, this.size, halfSize).stroke({width: 1, color: bgColor})
        this.draw.line(halfSize, 0, halfSize, this.size).stroke({width: 1, color: bgColor})
    };

    this.createLegends = function (quadrant, items) {

        var legend = document.getElementById(quadrant._id);
        if (!legend) {
            legend = document.createElement("DIV");
            legend.id = quadrant._id;
            legend.classList.add('legend');
            legend.style.position = 'absolute';
            legend.style.left = quadrant.left;
            legend.style.right = quadrant.right;
            legend.style.top = quadrant.top;
            legend.style.bottom = quadrant.bottom;

            legend.append(this.createButton(quadrant, quadrant.index - 1));
            legend.append(document.createElement("OL"));
        }

        var list = legend.getElementsByTagName('OL')[0];
        list.innerHTML = '';

        items.forEach(function(item) {
            var li = document.createElement("LI");

            if (item.icon || item.url) {
                var image = document.createElement("IMG");
                image.src = item.icon || ("http://www.google.com/s2/favicons?domain=" + item.url);
                image.width = 18;
                image.height = 18;
                li.appendChild(image);
            }

            var link = document.createElement('A');
            link.appendChild(document.createTextNode(item.name));
            link.title = item.name;
            if (item.url) {
                link.href = item.url;
            }
            link.target = 'blank';
            li.appendChild(link);

            list.appendChild(li);
        });

        this.element.append(legend);
    };

    this.createButton = function (quadrant, i) {
        var button = document.createElement("BUTTON");

        button.appendChild(document.createTextNode("+ " + quadrant.name));
        button.setAttribute('data-index', i);
        button.setAttribute('data-id', quadrant._id);
        button.style.background = quadrant.color;

        button.onclick = function (event) {
            var name = prompt('Bitte Namen eingeben');
            if (!name) {
                return;
            }
            var url = prompt('Bitte gib eine URL eingeben (optional)');

            var newItem = new this.db.items({
                name: name,
                url: url,
                coords: {r: 0, t: 0},
                movement: "c",
                color: quadrant.color
            });

            quadrant.items.addChild(newItem, function (err, res) {
                if (!err) {
                    this.render();
                }
            }.bind(this));

        }.bind(this);

        return button;
    };

    // { name: "Pair Programming", coords: { r: 130, t: 170 }, movement: "c", url: "https://google.de/"}
    this.drawItem = function (item) {

        var group = this.draw.group().draggable().addClass('item');

        var itemSize = 24;
        var point = this.polarToCartesian(item.coords.r, item.coords.t);
        group.data('item-point', point);

        var offset = (this.size / 2) - (itemSize / 2);
        var x = point.x + offset,
            y = point.y + offset;

        var title = document.createElement('TITLE');
        title.textContent = " " + item.index + " ";
        group.node.appendChild(title);
        group.node.style.cursor = "pointer";
	
		
		if (item.icon || item.url) {
            var iconUrl = item.icon || ("http://www.google.com/s2/favicons?domain=" + item.url);
			group.image(iconUrl, 18, 18).center(x, y);
	        group.text(item.index).center(x, y + 15).addClass('item-label');
		}
		else {
	        group.circle(itemSize, itemSize).center(x, y).attr({fill: item.color});
	        group.text(item.index).center(x, y).addClass('item-label');
		}
		
        group.data('item-name', item.name);
        group.data('item-id', item._id);

        group.off('dragend').on('dragend', function(event){

            event.preventDefault();

            var matrix = event.target.getAttribute('transform');
            if (matrix) {
                var group = event.detail.handler.el;

                matrix = matrix.split('(')[1].split(')')[0].split(',');

                var point = group.data('item-point');
                point.x = Number(point.x) + Number(matrix[4]);
                point.y = Number(point.y) + Number(matrix[5]);
    			var coords = this.cartesianToPolar(point.x, point.y);

                var item = undefined;
                this.db.items.getById(group.data('item-id'), function(err, res){
                    if (!err){
                        item = res;
                    }
                });

				item.coords = coords;

                item.save(function(err, res){
                    if (!err){
                        Object.assign(item, res);
                    }
                });
            }

            return false;
        }, this);

        group.off('contextmenu').on('contextmenu', function(event) {
            event.preventDefault();

            this.deleteItem(event.currentTarget);

            return false;
        }.bind(this));
    };

    this.deleteItem = function(element) {
        var name = element.getAttribute('data-item-name');
        if (confirm("Soll das Element \"" + name + "\" endgültig gelöscht werden?")) {
            element.remove();

            var item = undefined;
            this.db.items.getById(element.getAttribute('data-item-id'), function (err, res) {
                if (!err) {
                    item = res;
                }
            });

            item.delete(function (err, res) {
                if (!err) {
                    // res is the ID of the deleted object
                    console.log('Item "' + res.result.join() + '" deleted!');
                    this.render();
                }
            }.bind(this));
        }
    };

    this.render = function () {
        var quadrants = [];
        this.radar.quadrants.getChild(function (err, res) {
            if (!err) {
                quadrants = res;
            }
        }.bind(this));

        for (var i in quadrants) {

            var quadrant = quadrants[i];
            quadrant.index = Number(i) + 1;

            /*
             * Todo: Legende zeichnen
             */

            var items = [];
            quadrant.items.getChild(function (err, res) {
                if (!err) {
                    items = res;
                }
            }.bind(this));

            items.forEach(function (item, index) {
                if (item) {
                    item.index = String(index + 1);
                    item.color = quadrant.color;
                    this.drawItem(item);
                }
            }, this);

            this.createLegends(quadrant, items)

        }
    };

    this.polarToCartesian = function (r, t) {
        var a = t * Math.PI / 180;

        return {
            x: r * Math.cos(a),
            y: r * Math.sin(a)
        };
    };

    this.cartesianToPolar = function (x, y) {
        return {
            r: Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)),
            t: Math.atan2(x, y) * -(180 / Math.PI) + 90
        };
    };

    // this.getJSON = function() {
    //
    //     var request = new XMLHttpRequest();
		// request.open('GET', this.url, false);  // `false` makes the request synchronous
		// request.setRequestHeader("x-apikey", '592d79a430b19d4b2a111b3f');
    //     request.send(null);
    //
    //     if (request.status === 200) {
    //         return JSON.parse(request.responseText);
    //     }
    //
    //     return false;
    // };
    //
    // this.sendJSON = function () {
    //     var request = new XMLHttpRequest();
    //     request.open('POST', this.url, false);  // `false` makes the request synchronous
    //     request.setRequestHeader("x-apikey", '592d79a430b19d4b2a111b3f');
    //     request.send(JSON.stringify(this.data));
    //
    //     if (request.status === 200) {
    //         return JSON.parse(request.responseText);
    //     }
    //
    //     return false;
    // }
}
