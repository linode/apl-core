#/usr/bin/env bash
index="../_customers/customers.yaml"
cd values/_customers
rm $index &> /dev/null
customerFiles=$(find . -name "*.yaml")
echo "# GENERATED, DO NOT EDIT !!" > $index
echo "customers:" >> $index
for f in $customerFiles; do
  customerId=$(echo $f | sed -e "s/\.yaml//g" | sed -e "s/\.\///g")
  echo "  $customerId:" >> $index
  cat $f | sed -e 's/^/    /' >> $index
done  
cd - &> /dev/null