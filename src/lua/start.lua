return redis.call('PSETEX', KEYS[1], ARGV[1], '');
