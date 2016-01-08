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
      radicchio.startTimer('abc123', '10000')
      .then((result) => {
        expect(result).to.equal(true);
        done();
      });
    });
  });

  describe('#disableTimer', () => {
    it('Should delete the timer key in Redis', (done) => {
      radicchio.disableTimer('abc123')
      .then((result) => {
        expect(result).to.equal(1);
        done();
      });
    });
  });

  describe('#getTimeLeft', () => {
    it('Should get the time to live on a timer id', (done) => {
      radicchio.startTimer('abc1234', '10000')
      .then(() => {
        radicchio.getTimeLeft('abc1234')
        .then((result) => {
          expect(result).to.be.at.least(0);
          done();
        });
      });
    });
  });

  describe('#getTimeLeftOnAllKeys', () => {
    it('Should get the time to live on an array of timer ids', (done) => {
      Promise.all([
        radicchio.startTimer('abc12345', '10000'),
        radicchio.startTimer('abc123456', '10000'),
      ])
      .then(() => {
        radicchio.getTimeLeftOnAllKeys(['abc12345', 'abc123456'])
        .then((results) => {
          expect(results).to.have.length(2);
          done();
        });
      });
    });
  });
});
