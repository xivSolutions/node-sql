var Postgres = function() {
  this.output = [];
  this.params = [];
}

Postgres.prototype.getQuery = function(node) {
  this.visit(node);
  //automatic 'from'
  if(!this._visitedFrom) {
  }
  return { text: this.output.join(' '), params: this.params };
}

Postgres.prototype.visit = function(node) {
  switch(node.type) {
    case 'QUERY': return this.visitQuery(node);
    case 'SELECT': return this.visitSelect(node);
    case 'FROM': return this.visitFrom(node);
    case 'WHERE': return this.visitWhere(node);
    case 'BINARY': return this.visitBinary(node);
    case 'TABLE': return this.visitTable(node);
    case 'COLUMN': return this.visitColumn(node);
    case 'JOIN': return this.visitJoin(node);
    case 'TEXT': return node.text;
    case 'UNARY': return this.visitUnary(node);
    case 'PARAMETER': return this.visitParameter(node);
    default: throw new Error("Unrecognized node type " + node.type);
  }
}

Postgres.prototype.quote = function(word) {
  return '"' + word + '"';
}

Postgres.prototype.visitSelect = function(select) {
  var result = ['SELECT', select.nodes.map(this.visit.bind(this)).join(', ')];
  this._selectEndIndex = this.output.length + result.length;
  return result;
}

Postgres.prototype.visitFrom = function(from) {
  this._visitedFrom = true;
  var result = [];
  result.push('FROM');
  for(var i = 0; i < from.nodes.length; i++) {
    result = result.concat(this.visit(from.nodes[i]));
  }
  return result;
}

Postgres.prototype.visitWhere = function(where) {
  var result = ['WHERE', where.nodes.map(this.visit.bind(this)).join(', ')]
  return result;
}

Postgres.prototype.visitBinary = function(binary) {
  return '(' + this.visit(binary.left) + ' ' + binary.operator + ' ' + this.visit(binary.right) + ')';
}

Postgres.prototype.visitUnary = function(unary) {
  return '(' + this.visit(unary.left) + ' ' + unary.operator + ')';
}

Postgres.prototype.visitQuery = function(queryNode) {
  this._queryNode = queryNode;
  for(var i = 0; i < queryNode.nodes.length; i ++) {
    var res = this.visit(queryNode.nodes[i]);
    this.output = this.output.concat(res);
  }
  return this;
}

Postgres.prototype.visitTable = function(tableNode) {
  var table = tableNode.table;
  var txt = table.getName();
  if(table.quote) {
    txt = '"' + txt + '"';
  }
  if(table.alias) {
    txt += ' AS ' + table.alias;
  }
  return txt;
}

Postgres.prototype.visitColumn = function(columnNode) {
  var table = columnNode.table;
  var txt = "";
  if(table.alias) {
    txt = table.alias;
  } else if(table.quote) {
    txt = '"' + table.getName() + '"';
  } else {
    txt = table.getName();
  }
  return txt + '."' + columnNode.name + '"';
}

Postgres.prototype.visitParameter = function(parameter) {
  this.params.push(parameter.value());
  return "$"+this.params.length;
}

Postgres.prototype.visitJoin = function(join) {
  var result = [];
  result = result.concat(this.visit(join.from));
  result = result.concat(join.subType + ' JOIN');
  result = result.concat(this.visit(join.to));
  result = result.concat('ON');
  result = result.concat(this.visit(join.on));
  return result;
}

module.exports = Postgres;