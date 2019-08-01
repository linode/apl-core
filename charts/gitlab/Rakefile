require_relative 'scripts/update-docker-images.rb'

namespace :images do

  desc 'Sync images between dev and com registries'
  task :sync, [:edition] do |t, args|
    CNGImageSync.execute(edition: args[:edition])
  end
end
