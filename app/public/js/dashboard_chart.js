expand = (s) => {
    return (s.length == 1) ? "0"+s : s;
};
timestamps = () => {
	str=[]
	for(h=0; h <= 23; h++) {
	    for(i=0; i < 60; i+=5) {
	        str.push(expand(String(h))+":"+expand(String(i)));
		}
	}
	return str;
};
processHeatmap = (hm) => {
	datas = [[], [], [], [], [], [], []];

	hm.sort((x, y) => {
		return x.hour - y.hour || x.minute - y.minute;
	});

	console.log(hm);

	for (var i = 0; i < hm.length; i++) {
		perc = (hm[i].total != 0) ? hm[i].value/hm[i].total : null;
		datas[hm[i].day].push(perc)
	}
	// shift and push since 0 is sunday
	datas.push(datas.shift());

	return datas;
};

fetch('/getHeatMap')
	.then(resp => resp.json())
	.then(data => {
		datas = processHeatmap(data.reply);
		console.log(datas);
		Plotly.newPlot("heatmap",
			[{
				"type": "heatmap",
				"colorscale": [
					[0, '#E32E49'],
					[1, '#08E318']
				],
				"hoverongaps": false,
				"y": ["Monday", "Tuesday", "Wedneyday", "Thursday", "Friday", "Saturday", "Sunday"],
				"x": timestamps(),
				"z": datas
			}],
		    {
				title: 'Heatmap',
				font: {
					size: 18
				}
			},
			{
				responsive: true
			}
		);
	})
	.catch(err => {
		console.log("err");
		console.error(err);
	});
