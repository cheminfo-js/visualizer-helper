export const filters = `
<style>
	#processingFilters h1 {
		margin-bottom: 0.2em;
		padding-bottom: 0.3em;
		border-bottom: 1px solid #ccc;
		font-weight: 600;
	}
	#processingFilters .explanation {
		margin-bottom: 1em;
		color: #444;
		font-size: 1em;
		font-style: italic;
		line-height: 1.5;
		max-width: 700px;
	}
</style>
<div id="processingFilters">
<h1>Processing filters</h1>
<div class="explanation">
	By using filters, you can improve your results by reducing variation between samples. This may include baseline correction, X-axis shifts, Y-axis rescaling, and other adjustments.
</div>
<table>
	<tr>
		<th></th>
		<th></th>
		<th>Name</th>
		<th>Options</th>
	</tr>
	<tr data-repeat='normalization.filters'>
		<td>
			<select onchange="updateOptions(this);" data-field='name'>
				<option value=""></option>
				<option value="centerMean">Center mean</option>
				<option value="centerMedian">Center median</option>
				<option value="divideBySD">Divide by SD</option>
				<option value="normed" data-options="value,normedAlgorithm">Normed</option>
				<option value="rescale" data-options="min,max">Rescale</option>
				<option value="setMinX" data-options="min">Set min X</option>
				<option value="setMaxX" data-options="max">Set max X</option>
				<option value="setMinY" data-options="min">Set min Y</option>
				<option value="setMaxY" data-options="max">Set max Y</option>
				<option value="firstDerivative" data-options="">First derivative</option>
				<option value="secondDerivative" data-options="">Second derivative</option>
				<option value="thirdDerivative" data-options="">Third derivative</option>
				<option value="savitzkyGolay" data-options="windowSize,derivative,polynomial">Savitzky-Golay</option>
				<option value="airPLSBaseline" data-options="">AirPLS baseline</option>
				<option value="iterativePolynomialBaseline" data-options="">Iterative polynomial baseline</option>
				<option value="rollingAverageBaseline" data-options="">Rolling average baseline</option>
				<option value="rollingMedianBaseline" data-options="">Rolling median baseline</option>
				<option value="rollingBallBaseline" data-options="">Rolling ball basline</option>
				<option value="ensureGrowing" data-options="value">Ensure growing X values</option>
				<option value="reverseIfNeeded" data-options="value">Ensure first X s smaller than last X</option>
				<option value="xFunction" data-options="function">Function on X</option>
				<option value="yFunction" data-options="function">Function on Y</option>
				<option value="calibrateX" data-options="from,to,targetX,nbPeaks">Calibrate X</option>
				<option value="paretoNormalization" data-options="">Pareto normalization</option>
			</select>
		</td>
		<td>
			<input style="display:none" type='number' placeholder="min" data-field='options.min' size="5">
			<input style="display:none" type='number' placeholder="max" data-field='options.max' size="5">
			<input style="display:none" type='number' placeholder="from" data-field='options.from' size="5">
			<input style="display:none" type='number' placeholder="to" data-field='options.to' size="5">
			<input style="display:none" type='number' placeholder="nbPeaks" data-field='options.nbPeaks' size="7">
			<input style="display:none" type='number' placeholder="targetX" data-field='options.targetX' size="7">
			<input style="display:none" type='number' placeholder="value" data-field='options.value' size="5">
			<input style="display:none" type='number' placeholder="windowSize" data-field='options.windowSize' size="5">
			<input style="display:none" type='number' placeholder="derivative" data-field='options.derivative' size="5">
			<input style="display:none" type='number' placeholder="polynomial" data-field='options.polynomial' size="5">
			<input style="display:none" type='text' placeholder="function" data-field='options.function' size="10">
			<select style="display:none" placeholder="normedAlgorithm" data-field='options.algorithm'>
				<option value="sum">Sum to value</option>
				<option value="absolute">Absolute sum to value</option>
				<option value="max">Max to value</option>
			</select>
		</td>
	</tr>
</table>
<h1>Normalization</h1>
<div class="explanation">
	Data may differ because they are acquired on different instruments or with varying acquisition parameters.
  The options below allow you to normalize the range and the number of points, as well as add exclusion zones that are not useful for comparison.
</div>
<table>
<tr>
	<th align="left">Range:</th>
	<td>
		from: <input type="number" name="normalization.from" step="any"> -
		to: <input type="number" name="normalization.to" step="any">
	</td>
</tr>
<tr>
	<th align="left">Apply range selection:</th>
	<td>
		<input type="radio" name="normalization.applyRangeSelectionFirst" value="true"id="applyBefore">
		<label for="applyBefore">Apply before filters</label><br>
		<input type="radio" name="normalization.applyRangeSelectionFirst" value="false" id="applyAfter">
		<label for="applyAfter">Apply after filters</label>
	</td>
</tr>
<tr>
	<th align="left">Exclusions</th>
	<td>
		<table>
			<tr>
				<th></th>
				<th></th>
				<th>From</th>
				<th>To</th>
			</tr>
			<tr data-repeat='normalization.exclusions'>
				<td><input type='number' data-field='from' size="5"></td>
				<td><input type='number' data-field='to' size="5"></td>
			</tr>
		</table>
	</td>
</tr>
<!--
<tr>
	<th align="left">Processing:</th>
	<td>
		<select name='normalization.processing'>
			<option value=""></option>
			<option value="firstDerivative">First derivative</option>
			<option value="secondDerivative">Second derivative</option>
			<option value="thirdDerivative">Third derivative</option>
		</select>
	</td>
</tr>
-->
<tr>
	<th align="left">Number of points:</th>
	<td>
		<input type='text' name='normalization.numberOfPoints'>
	</td>
</tr>
</table>
<script>
	function updateOptions(source) {
		let options = source.options[source.options.selectedIndex].getAttribute('data-options');
		let show = options ? options.split(',') : [];
		let optionsElement = $(source).parent().next();
		optionsElement.find('input').hide();
		optionsElement.find('textarea').hide();
		optionsElement.find('select').hide();
		for (let key of show) {
			optionsElement.find('input[placeholder=' + key + ']').show();
			optionsElement.find('textarea[placeholder=' + key + ']').show();
			optionsElement.find('select[placeholder=' + key + ']').show();
		}
	}
</script>
`;
