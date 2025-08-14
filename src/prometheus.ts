import { PrometheusDriver } from 'prometheus-query';
import { Endpoint, BaseUrl } from './settings';

const prom = new PrometheusDriver({
    endpoint: Endpoint,
    baseURL: BaseUrl,
});

// Get status
prom.status().then(status => console.log('Status:', status));

// Get active targets
prom.targets('active').then(targets => console.log('Active Targets:', targets))

// Get all label names
prom.labelNames().then(names => console.log('Label Names:', names));
// Get all metrics
prom.labelValues('__name__').then(values => console.log('Label Values:', values));

// Run an instant query
prom.instantQuery('consul_api_http').then(result => {
    console.log('Instant Query Result:', result);
});

// Run a range query
prom.rangeQuery('consul_api_http', Date.now() - 3600 * 1000, Date.now(), '5m').then(result => {
    console.log('Range Query Result:', result);
});

// Series query
prom.series('consul_api_http', Date.now() - 3600 * 1000, Date.now()).then(series => {
    console.log('Series:', series);
});

// Alerts
prom.alerts().then(alerts => console.log('Alerts:', alerts));
