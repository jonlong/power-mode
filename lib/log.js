module.exports = function log(err, result) {
  if (err) {
    console.log('Error: '+err);
    return;
  }
  console.log(result);
};