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

/**
 * Out the array to a csv format.
 * @param fields object
 * @param includeHeaders boolean
 * @returns {*}
 */
Array.prototype.toCSV = function(fields,includeHeaders,parser)
{
    if (! this.length) return "";

    /**
     * Return the value of the result
     * @param result mixed
     * @returns {string}
     */
    var getValue = function(result) {

        if (typeof result == 'boolean') {
            return result ? 'TRUE' : 'FALSE';
        }
        else if (Array.isArray(result)) {
            return result.join(", ");
        }
        else if (result instanceof Date) {
            return result.toExcelDate();
        }
        else if (! result) {
            return "";
        }
        else if (typeof result == 'object') {
            if (result.toJSON) {
                var object = result.toJSON();
                return object._title;
            }
            if (typeof result.toString == 'function') {
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
        if (parser) parser(object);
        var csv = [];
        for (var field in fields)
        {
            if (! out.length && includeHeaders) {
                headers.push(fields[field]);
            }
            csv.push( getValue(object[field]) );
        }
        out.push(csv);
    });

    if (includeHeaders) {
        out.splice(0,0,headers);
    }

    return out;
};

Date.prototype.toExcelDate = function()
{
    var date = [this.getMonth()+1, this.getDate(), this.getFullYear()].join("/");
    var time = [this.getHours(), this.getMinutes(), this.getSeconds()].join(":");
    return date + " " + time;
};
