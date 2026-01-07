/*
In the general preferences you should put something like:
require(['TrackOptions'], function(TrackOptions) {
    TrackOptions('massOptions');
})
*/

define([], function () {
  function watchAnswers(cookieName, exercises, options = {}) {
    let myAnswers = JSON.parse(window.localStorage.getItem(cookieName) || '{}');

    for (let i = 0; i < exercises.length; i++) {
      let exercise = exercises[i];
      let myAnswer = myAnswers[exercise.id];
      if (myAnswer) {
        exercise.myResult = myAnswer;
      }
    }

    exercises.onChange(function (evt) {
      switch (evt.target.__name) {
        case 'myResult': {
          const target = evt.target.__parent;
          if (target) {
            myAnswers[target.id] = target.myResult;
          }
          break;
        }
        case 'exercises': {
          if (!options.keepAnswers) {
            myAnswers = {};
          }
          break;
        }
        default:
        // throw new Error(`Unexpected target: ${evt.target.__name}`);
      }
      window.localStorage.setItem(cookieName, JSON.stringify(myAnswers));
    });
  }
  return watchAnswers;
});
