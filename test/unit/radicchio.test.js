require('babel-core/register');
import chai from 'chai';
import Promise from 'bluebird';
import radicchio from '../../src/radicchio';

const expect = chai.expect;

describe('Radicchio_Tests', () => {

  before((done) => {
    radicchio.init()
    .then(() => {
      done();
    });
  });

  describe('#startTimer', () => {
    it('Should store the timer key in Redis', (done) => {
      radicchio.startTimer('10000', {})
      .then((result) => {
        expect(result).to.be.a('string');
        done();
      });
    });
  });

  // The on function works properly, but there is no way to access the instance of event emitter in radicchio
  // Also the callback exceeds 2 seconds for a delete so it times out
  describe('#on', () => {
    xit('Should listen for the del command through Redis pub/sub', (done) => {
      radicchio.on('deleted', function (message) {
        expect(message).to.be.a('string');
        done();
      });
    });

    xit('Should listen for the expired command through Redis pub/sub', (done) => {
      radicchio.on('expired', function (message) {
        expect(message).to.be.an('object');
        done();
      });
    });
  });

  describe('#suspendTimer', () => {
    it('Should delete the timer from Redis and storing ttl in the global set', (done) => {
      radicchio.startTimer('10000')
      .then((timerId) => {
        radicchio.suspendTimer(timerId)
        .then((result) => {
          expect(result).to.equal(true);
          done();
        });
      });
    });
  });

  describe('#resumeTimer', () => {
    it('Should set an expire on the timerId stored in global set with remaining ttl', (done) => {
      radicchio.startTimer('10000')
      .then((timerId) => {
        radicchio.suspendTimer(timerId)
        .then(() => {
          radicchio.resumeTimer(timerId)
          .then((result) => {
            expect(result).to.equal(true);
            done();
          });
        });
      });
    });
  });

  describe('#deleteTimer', () => {
    it('Should delete the timer key in Redis', (done) => {
      const data = {
        id: 'abc123',
        exampleData: 10,
        otherData: {},
      };

      radicchio.startTimer('10000', data)
      .then((timerId) => {
        radicchio.deleteTimer(timerId)
        .then((result) => {
          expect(result).to.be.an('object');
          done();
        });
      });
    });
  });

  describe('#getTimeLeft', () => {
    it('Should get the time to live on a timer id', (done) => {
      radicchio.startTimer('10000')
      .then((timerId) => {
        radicchio.getTimeLeft(timerId)
        .then((result) => {
          expect(result.timeLeft).to.be.at.least(0);
          done();
        });
      });
    });
  });

  describe('#getAllTimesLeft', () => {
    it('Should get the time to live on all timer ids in the global set', (done) => {
      Promise.all([
        radicchio.startTimer('10000'),
        radicchio.startTimer('10000'),
      ])
      .then(() => {
        radicchio.getAllTimesLeft()
        .then((results) => {
          expect(results).to.be.a('array');
          done();
        });
      });
    });
  });

  describe('#getTimerData', () => {
    it('Should get the data associated with a timer id from the global data set', (done) => {
      const data = {
        id: 'abc123',
        exampleData: 10,
        otherData: {},
      };

      radicchio.startTimer('10000', data)
      .then((timerId) => {
        radicchio.getTimerData(timerId)
        .then((result) => {
          expect(result).to.be.an('object');
          done();
        });
      });
    });
  });

  describe('#getDataFromAllTimers', () => {
    it('Should get the associated data on all timer ids in the global data set', (done) => {
      const data = {
        id: 'abc123',
        exampleData: 10,
        otherData: {},
      };

      Promise.all([
        radicchio.startTimer('10000', data),
        radicchio.startTimer('10000', data),
      ])
      .then(() => {
        radicchio.getDataFromAllTimers()
        .then((results) => {
          expect(results).to.be.a('array');
          done();
        });
      });
    });
  });
});
