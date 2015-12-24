require('babel-core/register');
import chai from 'chai';
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
});
