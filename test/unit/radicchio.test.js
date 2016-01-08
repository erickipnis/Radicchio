require('babel-core/register');
import chai from 'chai';
import Promise from 'bluebird';
import radicchio from '../../src/radicchio';

const expect = chai.expect;
const setSuffix = '-set';
const fieldSuffix = '-field';

describe('Radicchio_Tests', () => {

  before((done) => {
    radicchio.init()
    .then(() => {
      done();
    });
  });

  describe('#startTimer', () => {
    it('Should store the timer key in Redis', (done) => {
      const id = 'abc123';

      radicchio.startTimer(id + setSuffix, id + fieldSuffix, '10000')
      .then((result) => {
        expect(result).to.equal(true);
        done();
      });
    });
  });

  describe('#disableTimer', () => {
    it('Should delete the timer key in Redis', (done) => {
      const id = 'abc123';

      radicchio.disableTimer(id + setSuffix, id + fieldSuffix)
      .then((result) => {
        expect(result).to.equal(1);
        done();
      });
    });
  });

  describe('#getTimeLeft', () => {
    it('Should get the time to live on a timer id', (done) => {
      const id = 'abc1234';

      radicchio.startTimer(id + setSuffix, id + fieldSuffix, '10000')
      .then(() => {
        radicchio.getTimeLeft(id + fieldSuffix)
        .then((result) => {
          expect(result).to.be.at.least(0);
          done();
        });
      });
    });
  });

  describe('#getTimeLeftOnAllKeys', () => {
    it('Should get the time to live on an array of timer ids', (done) => {
      const id1 = 'abc12345';
      const id2 = 'abc123456';
      Promise.all([
        radicchio.startTimer(id1 + setSuffix, id1 + fieldSuffix, '10000'),
        radicchio.startTimer(id1 + setSuffix, id2 + fieldSuffix, '10000'),
      ])
      .then(() => {
        radicchio.getTimeLeftOnSetKeys(id1 + setSuffix)
        .then((results) => {
          expect(results).to.have.length(2);
          done();
        });
      });
    });
  });
});
