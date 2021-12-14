document.head.insertAdjacentHTML('beforeend', `<style>
#spectacle #sidebar {
  background: black;
}

#spectacle #sidebar a {
  color: white;
}

#spectacle #sidebar a.active {
  color: #fd5;
}

#spectacle #sidebar h5 {
  color: #06d8b8;
  font-size: 1.3rem;
}

#nav h5:nth-child(3) {
  display: none;
}

#spectacle #sidebar section > ul {
  display: block;
  margin: 0;
}

#spectacle #sidebar section > a {
  margin: 1.5rem 0 .65rem;
  font-size: 1.3rem;
  color: #06d8b8;
}

#spectacle #sidebar a {
  margin-left: .75rem;
}

[href*="_aggregate"], [id*="_aggregate"],
[href*="_by_pk"], [id*="_by_pk"],
[href*="_aggregate_fields"], [id*="_aggregate_fields"],
[href*="_avg_fields"], [id*="_avg_fields"],
[href*="_bool_exp"], [id*="_bool_exp"],
[href*="_constraint"], [id*="_constraint"],
[href*="_inc_input"], [id*="_inc_input"],
[href*="_insert_input"], [id*="_insert_input"],
[href*="_max_fields"], [id*="_max_fields"],
[href*="_min_fields"], [id*="_min_fields"],
[href*="_mutation_response"], [id*="_mutation_response"],
[href*="_on_conflict"], [id*="_on_conflict"],
[href*="_order_by"], [id*="_order_by"],
[href*="_pk_columns_input"], [id*="_pk_columns_input"],
[href*="_select_column"], [id*="_select_column"],
[href*="_set_input"], [id*="_set_input"],
[href*="_stddev_fields"], [id*="_stddev_fields"],
[href*="_stddev_pop_fields"], [id*="_stddev_pop_fields"],
[href*="_stddev_samp_fields"], [id*="_stddev_samp_fields"],
[href*="_sum_fields"], [id*="_sum_fields"],
[href*="_update_column"], [id*="_update_column"],
[href*="_var_pop_fields"], [id*="_var_pop_fields"],
[href*="_var_samp_fields"], [id*="_var_samp_fields"],
[href*="_variance_fields"], [id*="_variance_fields"],
[href*="_args"], [id*="_args"],
[href*="_one"], [id*="_one"],
[href*="_root"], [id*="_root"],
[href="#definition-order_by"], [id="definition-order_by"],
[href="#definition-Boolean"], [id="definition-Boolean"],
[href="#definition-Float"], [id="definition-Float"],
[href="#definition-Int"], [id="definition-Int"],
[href="#definition-Int_comparison_exp"], [id="definition-Int_comparison_exp"],
[href="#definition-String"], [id="definition-String"],
[href="#definition-String_comparison_exp"], [id="definition-String_comparison_exp"],
[href="#definition-float8"], [id="definition-float8"],
[href="#definition-float8_comparison_exp"], [id="definition-float8_comparison_exp"],
[href="#definition-timestamptz"], [id="definition-timestamptz"],
[href="#definition-timestamptz_comparison_exp"], [id="definition-timestamptz_comparison_exp"] {
  display: none!important;
}

[href="#definition-resolution"], [id="definition-resolution"] {
  display: none!important;
}
</style>`)
