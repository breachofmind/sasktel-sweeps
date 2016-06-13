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