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
      radicchio.startTimer('10000')
      .then((result) => {
        expect(result).to.be.a('string');
        done();
      });
    });
  });

  describe('#on', () => {
    xit('Should listen for the del command through Redis pub/sub', (done) => {
      radicchio.on('del', function (message) {
        console.log('message inside of radicchio.on del callback: ' + message);
        done();
      });
    });

    xit('Should listen for the expired command through Redis pub/sub', (done) => {
      radicchio.on('expired', function (message) {
        console.log('message inside of radicchio.on expired callback: ' + message);
        done();
      });
    });
  });

  describe('#deleteTimer', () => {
    it('Should delete the timer key in Redis', (done) => {
      radicchio.startTimer('10000')
      .then((timerId) => {
        radicchio.deleteTimer(timerId)
        .then((result) => {
          expect(result).to.equal(true);
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
          expect(result).to.be.at.least(0);
          done();
        });
      });
    });
  });

  describe('#getAllTimesLeft', () => {
    it('Should get the time to live on all timer ids in the global set', (done) => {
      const setId = radicchio.setId;
      Promise.all([
        radicchio.startTimer('10000'),
        radicchio.startTimer('10000'),
      ])
      .then(() => {
        radicchio.getAllTimesLeft(setId)
        .then((results) => {
          expect(results).to.be.a('array');
          done();
        });
      });
    });
  });
});
