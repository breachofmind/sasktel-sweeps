Array.prototype.keymap = function(process)
{
    var out = {};
    if (! arguments.length) {
        throw ("Callback required for Array.keymap()");
    }
    this.forEach(function(item,i) {
        var arr = process(item,i);
        if (! arr) {
            return;
        }
        if (typeof arr == "string") {
            return out[i] = arr;
        }
        return out[arr[0]] = arr[1];
    });
    return out;
};


Array.prototype.toCSV = function(includeHeaders)
{
    if (! this.length) return "";

    var getValue = function(result) {

        if (typeof result == 'boolean') {
            return result ? 'TRUE' : 'FALSE';
        }
        if (Array.isArray(result)) {
            return result.join(", ");
        }
        if (result instanceof Date) {
            return result.toString();
        }
        if (! result) {
            return "";
        }

        if (typeof result == 'object') {
            if (result.toJSON) {
                var object = result.toJSON();
                return object._title;
            }
            if (result.toString) {
                return result.toString();
            }
        }

        return result;
    };

    var out = [], headers = [];
    this.forEach(function(o) {

        var object = o;
        if (o.toJSON) {
            object = o.toJSON();
        }
        var csv = [];
        for (var header in object)
        {
            if (! out.length && includeHeaders) {
                headers.push (header);
            }

            csv.push(getValue(object[header]));
        }
        out.push(csv);
    });

    if (includeHeaders) {
        out.splice(0,0,headers);
    }

    return out;
};