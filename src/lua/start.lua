redis.call('HSET', KEYS[1], KEYS[2], '')
return redis.call('PSETEX', KEYS[2], ARGV[1], '')
