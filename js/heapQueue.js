// the constructor can take in an optional comparator if we don't want to use the default option
function heapq(cmp) {
    this.cmp = (cmp || function(a, b) { return a - b; });
    this.length = 0;
    this.data = [];
}

heapq.prototype.peek = function() {
    if (this.data.length > 0) {
        return this.data[0];
    }
    return null;
}

heapq.prototype.push = function(value) {
    this.data.push(value);
    var pos = this.data.length - 1;
    var parent;
    var item;
    while (pos > 0) {
        parent = (pos - 1) >>> 1; // divide by 2
        if (this.cmp(this.data[pos], this.data[parent]) < 0 ) {
            item = this.data[parent];
            this.data[parent] = this.data[pos];
            this.data[pos] = item;
            pos = parent;
        } else break;
    }
    return ++this.length;
}

heapq.prototype.pop = function() {
    var ret, last_val;
    if (this.data.length > 0) {
        ret = this.data[0];
        last_val = this.data.pop();
    }
    this.length--;
    if (this.data.length > 0) {
        this.data[0] = last_val;
        var pos = 0;
        var last = this.data.length - 1;
        var left, right, minPos, item;
        while (true) {
            left = (pos << 1) + 1;
            right = left + 1;
            minPos = pos;
            if (left <= last && this.cmp(this.data[left], this.data[minPos]) < 0) {
                minPos = left;
            }
            if (right <= last && this.cmp(this.data[right], this.data[minPos]) < 0) {
                minPos = right;
            }
            if (minPos !== pos) {
                item = this.data[minPos];
                this.data[minPos] = this.data[pos];
                this.data[pos] = item;
                pos = minPos;
            } else {
                break;
            }
        }
        return ret;
    }


}