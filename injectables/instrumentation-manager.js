if(!window.evo)
{
	window.evo = {}
}

hyper.log ('intrumentation manager loading...')
function generateUUID() {
	var d = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random()*16)%16 | 0;
		d = Math.floor(d/16);
		return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	});
	return uuid;
}

var me = window.evo.instrumentation =
{
	serviceProviders: [],

	addServiceProvider: function(serviceProvider)
	{
		hyper.log('inst.addServiceProvider called for '+serviceProvider.name)
		var me = window.evo.instrumentation
		me.serviceProviders[serviceProvider.name] = serviceProvider
	},

	/*
	This lets the workbench user drill down into providers with variable depth hierarchies. A level is a dot-delimited string with the root level first.
	Examples could 'cordova', 'cordova.accalerometer', 'ble.alldevices', 'ble.devices.xxxxxxxxxxxxxx', 'ble.devices.xxxxxxxxxxxx.characteristic_yyyyyyy'

	When calling with a path 'xxx' the result is an array of what is directly under that path (and can be either called selectHierarchy on again or called subscribeToService on (if it is a service).
	 */
	selectHierarchy: function(path)
	{
		hyper.log('inst.selectHierarchy called for path '+path)
		var me = window.evo.instrumentation
		if(!path || path == 'undefined')
		{
			var rv = []
			for(var pname in me.serviceProviders)
			{
				var provider = me.serviceProviders[pname]
				rv.push({name: provider.name, icon: provider.icon, selectable: true})
			}
			window.hyper.sendMessageToServer(window.hyper.IoSocket, 'client.instrumentation', {clientID: window.hyper.clientID, hierarchySelection:  rv })
		}
		else
		{
			var levels = path.split('.')
			var serviceProviderName = levels[0]
			if(path.indexOf('.') == -1)
			{
				serviceProviderName = path
			}
			console.log('looking up serviceprovider '+serviceProviderName)
			var serviceProvider = me.serviceProviders[serviceProviderName]
			serviceProvider.selectHierarchy(path, function(result)
			{
				window.hyper.sendMessageToServer(window.hyper.IoSocket, 'client.instrumentation', {clientID: window.hyper.clientID, hierarchySelection: result })
			})
		}
	},

	subscribeToService: function(path, params, interval)
	{
		var me = window.evo.instrumentation
		hyper.log('inst.subscribeToService called for path '+path)
		if(path && path != 'undefined')
		{
			var levels = path.split('.')
			hyper.log('levels are '+JSON.stringify(levels))
			var serviceProviderName = levels[0]
			hyper.log('looking up serviceprovider '+serviceProviderName)
			var serviceProvider = me.serviceProviders[serviceProviderName]
			var subscriptionID = serviceProvider.subscribeTo(path, params, interval, function(data)
			{
				// data is an object with key, value pairs (obivously), where the kay is the name of the data channel and the value is, well.. the value. Most channels will only have one pair, but the cordova accelerometer have three (x,y,z)
				window.hyper.sendMessageToServer(window.hyper.IoSocket, 'client.instrumentation', {clientID: window.hyper.clientID, time: Date.now(), serviceData: {path: path, data: data} })
			})
			hyper.log('got sid '+subscriptionID+' back for subscription on path '+path)
			window.hyper.sendMessageToServer(window.hyper.IoSocket, 'client.instrumentation', {clientID: window.hyper.clientID, serviceSubscription: {path: path, subscriptionID: subscriptionID} })
		}
		else
		{
			hyper.log('* skipping subscribeToService call for bad path "'+path+'"')
		}
	},

	unSubscribeToService: function(path, subscriptionId)
	{
		var me = window.evo.instrumentation
		if(path && path != 'undefined')
		{
			var levels = path.split('.')
			var serviceProviderName = levels[0]
			var serviceProvider = me.serviceProviders[serviceProviderName]
			serviceProvider.unSubscribeTo(subscriptionId, function()
			{
				hyper.log('sending unsubscribe successful to client')
				window.hyper.sendMessageToServer(window.hyper.IoSocket, 'client.instrumentation', {clientID: window.hyper.clientID, serviceUnsubscribe: {path: path, subscriptionID: subscriptionID} })
			})
		}
	}
}