document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('.radar').forEach(function (element) {
        var radar = new Radar();
        radar.init(element);
        radar.render();
    });
}, false);


function Radar() {

    this.size = window.innerWidth / 2;
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

        document.title = this.radar.name;

        this.drawBackground();
    };

    this.loadData = function() {
        $.ajaxSetup().async = false;

        this.db = new restdb("592d79a430b19d4b2a111b3f", {});
        this.db.radars.find({name: "twofour"}, {}, function (err, radars) {
            if (!err) {
                this.radar = radars[0];
            }
        }.bind(this));
    };

    this.drawBackground = function () {
        var space = (this.size / 4);

        for (var i = 1; i < 5; i++) {
            var size = i * (space) - this.padding;
            this.draw.circle(size).move((this.size / 2) - (size / 2), (this.size / 2) - (size / 2)).fill('transparent').stroke('#585858');
            this.draw
                .text("Zone " + i)
                .move((this.size / 2) - 14, (this.size / 2) + (size / 2) - 40)
                .rotate(-90)
                .font({ size: 12 });
        }

        var halfSize = (this.size / 2);
        this.draw.line(0, halfSize, this.size, halfSize).stroke({width: 1})
        this.draw.line(halfSize, 0, halfSize, this.size).stroke({width: 1})
    };

    this.createLegends = function (quadrant, items) {

        var legend = document.createElement("DIV");
        legend.style.position = 'absolute';
        legend.style.left = quadrant.left;
        legend.style.right = quadrant.right;
        legend.style.top = quadrant.top;
        legend.style.bottom = quadrant.bottom;

        var button = this.createButton(quadrant, quadrant.index - 1);
        legend.append(button);

        var list = document.createElement("OL");
        legend.append(list);

        items.forEach(function(item) {
            var link = document.createElement('A');
            link.appendChild(document.createTextNode(item.name));
            link.title = item.name;
            link.href = item.url;
            link.target = 'blank';

            var li = document.createElement("LI");
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
                color: event.target.style.background
            });
            quadrant.items.addChild(newItem, function (err, res) {
                if (!err) {
                    // res is the saved child
                }
            });

            this.drawItem(newItem);

        }.bind(this);

        return button;
    };

    // { name: "Pair Programmincoords, coords: { r: 130, t: 170 }, movement: "c"}
    this.drawItem = function (item) {

        var group = this.draw.group().draggable();
        /*
        group.draggable(function(x, y) {

        var coords = {x: true, y: true};
        var itemSize = 24,
            offset = (this.size / 2) - (itemSize / 2);

        if (x + offset < this.padding) {
            coords.x = this.padding - offset;
        }
        else if (x + offset > this.size - this.padding) {
            coords.x = this.size - this.padding - offset;
        }

        if (y + offset < this.padding) {
            coords.y = this.padding - offset;
        }
        else if (y + offset > this.size - this.padding) {
            coords.y = this.size - this.padding - offset;
        }

        return coords;

        }.bind(this));
        */

        var itemSize = 24;
        var point = this.polarToCartesian(item.coords.r, item.coords.t);
        group.data('item-point', point);

        var offset = (this.size / 2) - (itemSize / 2);
        var x = point.x + offset,
            y = point.y + offset;

        var title = document.createElement('TITLE');
        title.textContent = " " + item.index + " ";
        group.node.appendChild(title);
        group.circle(itemSize, itemSize).center(x, y).attr({fill: item.color});
        group.text(item.index).center(x, y + 4).font({ size: 12 });
        group.node.style.cursor = "pointer";

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

            if (confirm("Soll das Element \""+ event.currentTarget.textContent +"\" endgültig gelöscht werden?")) {
                event.currentTarget.remove();

                var item = undefined;
                this.db.items.getById(event.currentTarget.getAttribute('data-item-id'), function(err, res){
                    if (!err){
                        item = res;
                    }
                });

                item.delete(function(err, res){
                    if (!err){
                        // res is the ID of the deleted object
                        console.log('The item "'+ res.result.join() +'" is deleted!');
                    }
                });
            }

            return false;
        }.bind(this));
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
