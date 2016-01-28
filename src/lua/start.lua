redis.call('HSET', KEYS[1], KEYS[2], ARGV[1])
redis.call('HSET', KEYS[3], KEYS[2], ARGV[2])
return redis.call('PSETEX', KEYS[2], ARGV[1], ARGV[2])
