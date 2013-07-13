%run ./brush.html

var data = focus.select('path').datum()
var l = [data[10].date, data[25].date]
brush.extent(l)
brushed()
var ex = x2(l[0]);
var width = x2(l[1]) - ex;
var extent = context.select('g.x.brush rect.extent');
extent.attr('x', ex);
extent.attr('width', width);
