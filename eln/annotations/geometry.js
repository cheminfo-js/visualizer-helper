function pointAnnotation(point, options = {}) {
  const { fillColor = 'blue', strokeColor = 'blue' } = options;
  const { x, y } = point;

  return {
    line: 1,
    type: 'rectangle',
    strokeColor,
    strokeWidth: 0,
    fillColor,
    position: [
      {
        x, dx: '-2px', y, dy: '-2px',
      }, {
        x, dx: '2px', y, dy: '2px',
      },
    ]
  };
}

function lineAnnotation(point1, point2, options = {}) {
  const { strokeColor = 'rgba(0,0,255,0.5)' } = options;
  return {
    line: 1,
    type: 'line',
    strokeColor,
    strokeWidth: 1,
    position: [
      {
        x: point1.x,
        y: point1.y,
      }, {
        x: point2.x,
        y: point2.y,
      },
    ]
  }
}


module.exports = {
  pointAnnotation,
  lineAnnotation,
}
