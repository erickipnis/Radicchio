redis.call('HDEL', KEYS[1], KEYS[2])
return redis.call('DEL', KEYS[2])
