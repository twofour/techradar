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

    this.data = [];

    this.init = function (element) {

        this.element = element;
        this.draw = SVG(element).size(this.size, this.size);
        this.size -= this.padding;

        // this.url = 'api.php/' + element.getAttribute('data-src');
		this.url = "https://techradar-fb13.restdb.io/rest/quadrants?fetchchildren=true";
        this.data = this.getJSON();

        if (this.data == false) {
            this.url = 'radars/' + element.getAttribute('data-src') + '/current.json';
            this.data = this.getJSON();
        }


        document.title = this.data.name;

        this.drawBackground();
        this.drawActions();
    };

    this.drawBackground = function () {
        var space = (this.size / 4);

        for (var i = 1; i < 5; i++) {
            var size = i * (space) - this.padding;
            this.draw.circle(size).move((this.size / 2) - (size / 2), (this.size / 2) - (size / 2)).fill('transparent').stroke('#585858');
            this.draw.text("Zone " + i).move((this.size / 2), (this.size / 2) + (size / 2)).font({ size: 12 });
        }

        var halfSize = (this.size / 2);
        this.draw.line(0, halfSize, this.size, halfSize).stroke({width: 1})
        this.draw.line(halfSize, 0, halfSize, this.size).stroke({width: 1})
    };

    this.drawActions = function () {
        var quadrants = this.data.quadrants;
        for (var i in quadrants) {

            var quadrant = quadrants[i];

            var button = document.createElement("BUTTON");
            button.appendChild(document.createTextNode("+ " + quadrant.name));
            button.setAttribute('data-index', quadrant.index);
            button.style.background = quadrant.color;
            button.style.position = 'absolute';
            button.style.left = quadrant.left;
            button.style.right = quadrant.right;
            button.style.top = quadrant.top;
            button.style.bottom = quadrant.bottom;

            button.onclick = function (event) {
                var name = prompt('Bitte Namen eingeben');
                if (!name) {
                    return;
                }

                var index = Number(event.target.getAttribute('data-index')) - 1,
                    quadrant = this.data.quadrants[index];

                var newItem = { name: name, pc: { r: 0, t: 0 }, movement: "c", color: quadrant.color};
                quadrant.items.push(newItem);
                newItem.index = quadrant.index + '.' + (quadrant.items.length);

                this.drawItem(newItem);

            }.bind(this);

            this.element.append(button);
        }
    };

    // { name: "Pair Programming", pc: { r: 130, t: 170 }, movement: "c"}
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
        var point = this.polarToCartesian(item.pc.r, item.pc.t);
        group.data('item-point', point);

        var offset = (this.size / 2) - (itemSize / 2);
        var x = point.x + offset,
            y = point.y + offset;

        group.circle(itemSize, itemSize).move(x, y).attr({fill: item.color});
        group.text(item.name).move(x + 3, y + (itemSize / 4)).font({ size: 12 });
        group.node.style.cursor = "pointer";

        group.data('item-index', item.index);

        group.off('dragend').on('dragend', function(event){

            // event.detail.event hold the given data explained below

            var matrix = event.target.getAttribute('transform');
            if (matrix) {
                var group = event.detail.handler.el;

                matrix = matrix.split('(')[1].split(')')[0].split(',');

                var point = group.data('item-point');
                point.x = Number(point.x) + Number(matrix[4]);
                point.y = Number(point.y) + Number(matrix[5]);
                var pc = this.cartesianToPolar(point.x, point.y);

                var itemIndex = group.data('item-index').toString().split('.');
                var item = this.data.quadrants[itemIndex[0] - 1].items[itemIndex[1] - 1];

                item.pc = pc;

                this.sendJSON();
            }
        }, this);

        group.off('contextmenu').on('contextmenu', function(event) {
            event.preventDefault();

            if (confirm("Soll das Element \""+ event.currentTarget.textContent +"\" endgültig gelöscht werden?")) {
                var itemIndex = event.currentTarget.getAttribute('data-item-index').split('.');
                this.data.quadrants[itemIndex[0] - 1].items.splice(itemIndex[1] - 1, 1);
                event.currentTarget.remove();

                this.sendJSON();
            }

            return false;
        }.bind(this));
    };

    this.render = function () {
        var quadrants = this.data.quadrants;
        for (var i in quadrants) {

            var quadrant = quadrants[i];
            quadrant.index = Number(i) + 1;

            // Todo: Legende zeichnen

            quadrant.items = Object.values(quadrant.items);
            quadrant.items.forEach(function (item, index) {
                if (item) {
                    item.index = quadrant.index + '.' + (index + 1);
                    item.color = quadrant.color;
                    this.drawItem(item);
                }
            }, this);

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

    this.getJSON = function() {

        var request = new XMLHttpRequest();
		request.open('GET', this.url, false);  // `false` makes the request synchronous
		request.setRequestHeader("x-apikey", 'f6a3a5d47a0aa03117e25a2a9ca0c2b8b1207');
        request.send(null);

        if (request.status === 200) {
            return JSON.parse(request.responseText);
        }

        return false;
    };

    this.sendJSON = function () {
        var request = new XMLHttpRequest();
        request.open('POST', this.url, false);  // `false` makes the request synchronous
        request.setRequestHeader("x-apikey", 'f6a3a5d47a0aa03117e25a2a9ca0c2b8b1207');
        request.send(JSON.stringify(this.data));

        if (request.status === 200) {
            return JSON.parse(request.responseText);
        }

        return false;
    }
}
