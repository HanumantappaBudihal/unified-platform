const { Kafka } = require('kafkajs');
const config = require('../config');

function getAdmin() {
  const kafka = new Kafka({
    clientId: 'platform-api',
    brokers: config.kafka.brokers,
  });
  return kafka.admin();
}

async function provision(appSlug, environment = 'dev') {
  const topicPrefix = `${environment}.${appSlug}`;
  const defaultTopics = ['events', 'commands'];
  const admin = getAdmin();

  try {
    await admin.connect();

    const topics = defaultTopics.flatMap(name => [
      {
        topic: `${topicPrefix}.${name}`,
        numPartitions: 3,
        replicationFactor: 1,
        configEntries: [
          { name: 'retention.ms', value: '604800000' }, // 7 days
        ],
      },
      {
        topic: `${topicPrefix}.${name}.dlq`,
        numPartitions: 1,
        replicationFactor: 1,
        configEntries: [
          { name: 'retention.ms', value: '2592000000' }, // 30 days
        ],
      },
    ]);

    await admin.createTopics({ topics, waitForLeaders: true });

    const createdTopics = topics.map(t => t.topic);

    return {
      config: { topicPrefix, topics: createdTopics },
      credentials: { topicPrefix, brokers: config.kafka.brokers.join(',') },
    };
  } finally {
    await admin.disconnect();
  }
}

async function deprovision(appSlug, environment = 'dev') {
  const topicPrefix = `${environment}.${appSlug}`;
  const admin = getAdmin();

  try {
    await admin.connect();

    const metadata = await admin.listTopics();
    const appTopics = metadata.filter(t => t.startsWith(topicPrefix + '.'));

    if (appTopics.length > 0) {
      await admin.deleteTopics({ topics: appTopics });
    }
  } finally {
    await admin.disconnect();
  }
}

module.exports = { provision, deprovision };
