-- Enable real-time replication for the responses table
-- Required for Supabase client-side subscriptions to receive INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
