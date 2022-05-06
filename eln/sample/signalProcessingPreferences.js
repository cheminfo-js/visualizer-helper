export const filters = `
<h1>Preprocessing</h1>
<table>
    <tr>
	<th align="left">Filters</th>
	<td>
	    <table>
		<tr>
		    <th></th><th></th>
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
			</select>
		    </td>
		    <td>
			<input style="display:none" type='number' placeholder="min" data-field='options.min' size="5">
			<input style="display:none" type='number' placeholder="max" data-field='options.max' size="5">
			<input style="display:none" type='number' placeholder="value" data-field='options.value' size="5">
			<input style="display:none" type='number' placeholder="windowSize" data-field='options.windowSize' size="5">
			<input style="display:none" type='number' placeholder="derivative" data-field='options.derivative' size="5">
			<input style="display:none" type='number' placeholder="polynomial" data-field='options.polynomial' size="5">
			<select style="display:none" placeholder="normedAlgorithm" data-field='options.algorithm'>
				<option value="sum">Sum to value</option>
				<option value="absolute">Absolute sum to value</option>
				<option value="max">Max to value</option>
			</select>
		    </td>
		</tr>
	    </table>
	</td>
    </tr>
    <tr>
	<th align="left">Range:</th>
	<td>
	    from: <input type="number" name="normalization.from" step="any"> - 
	    to: <input type="number" name="normalization.to" step="any">
	</td>
    </tr>
    <tr>
	<th align="left">Exclusions</th>
	<td>
	    <table>
		<tr>
		    <th></th><th></th>
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
	    <input type='text' name='normalization.numberOfPoints' size="6">
	</td>
    </tr>
</table>
<script>
  function updateOptions(source) {
      let options=source.options[source.options.selectedIndex].getAttribute('data-options');
      let show=options ? options.split(',') : [];
      let optionsElement = $(source).parent().next();
      optionsElement.find('input').hide();
      optionsElement.find('textarea').hide();
      for (let key of show) {
	  optionsElement.find('input[placeholder='+key+']').show();
	  optionsElement.find('textarea[placeholder='+key+']').show();
      }
  }
</script>
`;
