/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript 
 */

define(['N/record', 'N/search', 'N/task', 'N/runtime', 'N/error'],

  function (record, search, task, runtime, error) {


    function afterSubmit(context) {

      try {

        log.debug("context.type", context.type)

        if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.EDIT) {

          log.debug("context.context.newRecord.id", context.type)

          let internalId = context.newRecord.id;
          let recordType = context.newRecord.type;
          let actionType = context.type
          let isSuiteTaxEnabled = true
          let isApplyWhtPartialAmountFld = 'custcol_ps_wht_apply_partial_payments';

          let taxCodeItemFieldMapObject = {
            "custrecord_ps_wht_taxcode_rate": "rate",
            "name": "itemid",
            "custrecord_ps_wht_taxcode_ar_acc": "araccount",
            "custrecord_ps_wht_taxcode_ap_account": "apaccount",
            "custrecord_ps_wht_taxcode_ap_item": "internalid",
            "custrecord_ps_wht_taxcode_ar_item": "internalid"

          }
          let taxCodeValesObj = getTaxCodeFieldValues(taxCodeItemFieldMapObject, internalId)
          log.debug("actionType", actionType)


          if (actionType == "create") 
          {
            let APItemId = createAPDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj)
            let ARITemId = createARDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj)
            submitARAndPRItemValue(internalId, recordType,APItemId, ARITemId)
          }


          else if (actionType == "edit") {
            let apItemInternalId = taxCodeValesObj.custrecord_ps_wht_taxcode_ap_item
            let arItemInternalId = taxCodeValesObj.custrecord_ps_wht_taxcode_ar_item

            delete taxCodeValesObj.custrecord_ps_wht_taxcode_ar_item;
            delete taxCodeValesObj.custrecord_ps_wht_taxcode_ap_item;
            delete taxCodeItemFieldMapObject.custrecord_ps_wht_taxcode_ar_item;
            delete taxCodeItemFieldMapObject.custrecord_ps_wht_taxcode_ap_item;

           

            if (apItemInternalId.length >0) {
              updateAPDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj, apItemInternalId)
            }
            else
            {
              let APItemId = createAPDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj)
               
              submitAPItem(internalId, recordType,APItemId)
            }

            if (arItemInternalId.length>0) {
              log.debug("arItemInternalId if condition", arItemInternalId)
              
              updateARDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj, arItemInternalId)
            
            }
            else
            {

              let ARItemId = createARDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj)

              
              
              submitARItem(internalId, recordType,ARItemId)

            }


          }


        }

      }

      catch (e) {
        msg = '<style>.text {display: none;}' // this will hide the JSON message
          + '.bglt td:first-child:not(.textboldnolink):after {'
          + 'color:black;font-size:8pt;' // set the desired css for our message
          + 'content: url(/images/5square.gif) \''
          + e.message
          + '\'}'
          + '</style>',
          err = error.create({
            name: 'NO_JSON',
            message: msg,
            notifyOff: true
          });

      }





    }

    function beforeSubmit(context) {


      let currentRecordType = context.newRecord.type

      let appliedTranObj = {
        "vendorpayment": "vendorbill",
        "customerpayment": "invoice"
      }

    }



    function getTaxCodeFieldValues(taxCodeItemFieldMapObject, internalId) {
      let taxCodeValueArray = Object.keys(taxCodeItemFieldMapObject);

      // log.debug("taxCodeValueArray", taxCodeValueArray)

      let taxCodeRacordValues = search.lookupFields({ type: 'customrecord_ps_tht_wht_tax_code', id: internalId, columns: taxCodeValueArray });

      // log.debug("custrecord_ps_wht_taxcode_subs_list value 32", taxCodeRacordValues.custrecord_ps_wht_taxcode_subs_list)

      if (Array.isArray(taxCodeRacordValues.custrecord_ps_wht_taxcode_subs_list)) {
        let newArray = [];

        // Loop through each element in the array
        for (let i = 0; i < taxCodeRacordValues.custrecord_ps_wht_taxcode_subs_list.length; i++) {
          let item = taxCodeRacordValues.custrecord_ps_wht_taxcode_subs_list[i];

          // Check if 'value' key exists and is an object
          if (item && typeof item === 'object' && 'value' in item) {
            newArray.push(item.value);
          }
          //  log.debug("newArray", newArray)
        }

        taxCodeRacordValues["custrecord_ps_wht_taxcode_subs_list"] = newArray
      }

      // else
      // {
      //   const commaSeparatedString = taxCodeRacordValues.custrecord_ps_wht_taxcode_subs_list.value
      //   const arrayOfNumbers = commaSeparatedString.split(',').map(Number);

      //   taxCodeRacordValues["custrecord_ps_wht_taxcode_subs_list"] = arrayOfNumbers
      // }

      // log.debug("custrecord_ps_wht_taxcode_subs_list",taxCodeRacordValues["custrecord_ps_wht_taxcode_subs_list"])

      taxCodeRacordValues["custrecord_ps_wht_taxcode_ar_acc"] = taxCodeRacordValues["custrecord_ps_wht_taxcode_ar_acc"].length>0? 
        taxCodeRacordValues.custrecord_ps_wht_taxcode_ar_acc[0].value : ""

      taxCodeRacordValues["custrecord_ps_wht_taxcode_ap_account"] = taxCodeRacordValues["custrecord_ps_wht_taxcode_ap_account"].length>0 ? 
        taxCodeRacordValues.custrecord_ps_wht_taxcode_ap_account[0].value : ""

      taxCodeRacordValues["custrecord_ps_wht_taxcode_ap_item"] = taxCodeRacordValues["custrecord_ps_wht_taxcode_ap_item"].length>0 ?
        taxCodeRacordValues["custrecord_ps_wht_taxcode_ap_item"][0].value : ""

      taxCodeRacordValues["custrecord_ps_wht_taxcode_ar_item"] = taxCodeRacordValues["custrecord_ps_wht_taxcode_ar_item"].length>0?
        taxCodeRacordValues["custrecord_ps_wht_taxcode_ar_item"][0].value : ""


      // if (taxCodeRacordValues.custrecord_ps_wht_taxcode_ar_acc.length > 0) {
      //   taxCodeRacordValues["custrecord_ps_wht_taxcode_ar_acc"] = taxCodeRacordValues.custrecord_ps_wht_taxcode_ar_acc[0].value
      // }
      // if (taxCodeRacordValues.custrecord_ps_wht_taxcode_ap_account.length > 0) {
      //   taxCodeRacordValues["custrecord_ps_wht_taxcode_ap_account"] = taxCodeRacordValues.custrecord_ps_wht_taxcode_ap_account[0].value
      // }
      // if (taxCodeRacordValues.custrecord_ps_wht_taxcode_ap_item.length > 0) {
      //   taxCodeRacordValues["custrecord_ps_wht_taxcode_ap_item"] = taxCodeRacordValues.custrecord_ps_wht_taxcode_ap_item[0].value
      // }
      // if (taxCodeRacordValues.custrecord_ps_wht_taxcode_ar_item.length > 0) {
      //   taxCodeRacordValues["custrecord_ps_wht_taxcode_ar_item"] = taxCodeRacordValues.custrecord_ps_wht_taxcode_ar_item[0].value
      // }

      let rate = taxCodeRacordValues.custrecord_ps_wht_taxcode_rate
      rate = rate.replace("%", "")
      taxCodeRacordValues.custrecord_ps_wht_taxcode_rate = rate



      return taxCodeRacordValues

    }

    function createAPDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj) {

      try
      {
         let objRecord = record.create({
           type: "discountitem",
         });

         for (let sourceFieldId in taxCodeItemFieldMapObject) {
           if (taxCodeItemFieldMapObject.hasOwnProperty(sourceFieldId)) {
             let targetFieldId = taxCodeItemFieldMapObject[sourceFieldId];

             //log.debug("sourceFieldId", sourceFieldId)

             if (sourceFieldId == "custrecord_ps_wht_taxcode_ap_account") {
               // log.debug("if targetFieldId custrecord_ps_wht_taxcode_ap_account", taxCodeValesObj["custrecord_ps_wht_taxcode_ap_account"])
               if (!taxCodeValesObj["custrecord_ps_wht_taxcode_ap_account"]) {
                 continue;
               }

               log.debug(
                 "if targetFieldId account",
                 taxCodeValesObj["custrecord_ps_wht_taxcode_ap_account"],
               );

               objRecord.setValue({
                 fieldId: "account",
                 value: taxCodeValesObj["custrecord_ps_wht_taxcode_ap_account"],
               });
             } else if (
               sourceFieldId == "custrecord_ps_wht_taxcode_ar_acc" ||
               sourceFieldId == "custrecord_ps_wht_taxcode_ap_account"
             ) {
               continue;
             } 
             else 
             {
               if (!taxCodeValesObj[sourceFieldId]) {
                 continue;
               }
               log.debug(
                 "AP else targetFieldId",
                 targetFieldId + " value=" + taxCodeValesObj[sourceFieldId],
               );

               let fieldValue = taxCodeValesObj[sourceFieldId]
               log.debug("fieldValue", fieldValue);


                  objRecord.setValue({
                    fieldId: targetFieldId,
                    value: fieldValue,
                  });
             
              
             }
           }
         }

         let saveId = objRecord.save({ ignoreMandatoryFields: true });

         log.debug("createAPDiscountItem saveId", saveId);

         return saveId;

      }
      catch(e)
      {
           log.error("createAPDiscountItem error", e);
      }

     


    

    }

    function createARDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj) 
    {

      try
      {

        log.debug("taxCodeItemFieldMapObject", taxCodeItemFieldMapObject);
         log.debug("taxCodeValesObj", taxCodeValesObj);
        let objRecord = record.create({
          type: "discountitem",
        });

        for (let sourceFieldId in taxCodeItemFieldMapObject) {
          if (taxCodeItemFieldMapObject.hasOwnProperty(sourceFieldId)) {
            let targetFieldId = taxCodeItemFieldMapObject[sourceFieldId];

            //  log.debug("sourceFieldId", sourceFieldId)

            if (sourceFieldId == "custrecord_ps_wht_taxcode_ar_acc") {
              if (!taxCodeValesObj["custrecord_ps_wht_taxcode_ar_acc"]) {
                continue;
              }

              objRecord.setValue({
                fieldId: "account",
                value: taxCodeValesObj["custrecord_ps_wht_taxcode_ar_acc"],
              });
            } else if (sourceFieldId == "name") {
              objRecord.setValue({
                fieldId: "itemid",
                value: "AR-" + taxCodeValesObj["name"],
              });
            } else if (
              sourceFieldId == "custrecord_ps_wht_taxcode_ap_account" ||
              sourceFieldId == "name" ||
              sourceFieldId == "custrecord_ps_wht_taxcode_ar_acc"
            ) {
              continue;
            } 
            else {
              log.debug(
                "AR else targetFieldId",
                targetFieldId + " value=" + taxCodeValesObj[sourceFieldId],
              );

              if (!taxCodeValesObj[sourceFieldId]) {
                continue;
              }

              let fieldValue = taxCodeValesObj[sourceFieldId];

           
                 objRecord.setValue({
                   fieldId: targetFieldId,
                   value: fieldValue,
                 });
            }
          }
        }

        let saveId = objRecord.save({ ignoreMandatoryFields: true });
        log.debug("saveId", saveId);

        return saveId;


      }
      catch(e)
      {
          log.error("createARDiscountItem error", e);

      }

      

    }

    function updateAPDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj, apItemInternalId) {

      try {

        let objRecord = record.load({
          type: "discountitem",
          id: apItemInternalId,
          isDynamic: true
        });

        for (let sourceFieldId in taxCodeItemFieldMapObject) {
          if (taxCodeItemFieldMapObject.hasOwnProperty(sourceFieldId)) {
            let targetFieldId = taxCodeItemFieldMapObject[sourceFieldId];

            if (sourceFieldId == "custrecord_ps_wht_taxcode_ap_account") 
            {
              
              
              let apAccount = taxCodeValesObj["custrecord_ps_wht_taxcode_ap_account"] ? taxCodeValesObj["custrecord_ps_wht_taxcode_ap_account"]
              : ""
              objRecord.setValue({
                fieldId: "account",
                value: apAccount
              });
            }

              // objRecord.setValue({
              //   fieldId: "itemid",
              //   value: taxCodeValesObj["name"]
              // });
            
            else if (sourceFieldId == "custrecord_ps_wht_taxcode_ap_account" || sourceFieldId == "custrecord_ps_wht_taxcode_ar_acc") {
              continue
            }
            else {
              log.debug("else targetFieldId", targetFieldId + " value=" + taxCodeValesObj[sourceFieldId])

              let fieldValue = taxCodeValesObj[sourceFieldId] ? taxCodeValesObj[sourceFieldId] : ""
              objRecord.setValue({
                fieldId: targetFieldId,
                value: fieldValue
              });

            }





          }


        }


        let saveId = objRecord.save({ ignoreMandatoryFields: true });
        log.debug("saveId", saveId)
        return saveId

      }
      catch (e) {
        log.error("error script", e)
      }









    }

    function updateARDiscountItem(taxCodeItemFieldMapObject, taxCodeValesObj, arItemInternalId) {


      try {
          delete taxCodeItemFieldMapObject.custrecord_ps_wht_taxcode_ap_account;
          delete taxCodeValesObj.custrecord_ps_wht_taxcode_ap_account;
          taxCodeValesObj["name"] = "AR-"+taxCodeValesObj["name"] 
        log.debug("arItemInternalId in function", arItemInternalId)
        log.debug("taxCodeItemFieldMapObject", taxCodeItemFieldMapObject);
        log.debug("taxCodeValesObj", taxCodeValesObj);
    
        let objRecord = record.load({
          type: "discountitem",
          id: arItemInternalId,
          isDynamic: true
        });


        for (let sourceFieldId in taxCodeItemFieldMapObject) {
          if (taxCodeItemFieldMapObject.hasOwnProperty(sourceFieldId)) {
            let targetFieldId = taxCodeItemFieldMapObject[sourceFieldId];

              log.debug("sourceFieldId", sourceFieldId)


            if (sourceFieldId == "custrecord_ps_wht_taxcode_ar_acc") {

              // log.debug("if targetFieldId name", taxCodeValesObj["name"])

              let arAccount = taxCodeValesObj["custrecord_ps_wht_taxcode_ar_acc"] ? taxCodeValesObj["custrecord_ps_wht_taxcode_ar_acc"] : ""

              objRecord.setValue({
                fieldId: "account",
                value: arAccount
              });
            }

            else 
            {
              log.debug("else targetFieldId in AR update", targetFieldId + " value=" + taxCodeValesObj[sourceFieldId])
              let fieldValue = taxCodeValesObj[sourceFieldId] ? taxCodeValesObj[sourceFieldId] : ""
              log.debug("else targetFieldId in AR update fieldValue", fieldValue);

              objRecord.setValue({
                fieldId: targetFieldId,
                value: fieldValue
              });

            }



          }
        }

        let saveId = objRecord.save({ ignoreMandatoryFields: true });
        log.debug("saveId", saveId)


        return saveId

      }

      catch (e) {
        log.error("updateARDiscountItem error", e);
      }










    }

    function submitARAndPRItemValue(internalId, recordType,apItemInternalId,arItemInternalId)
    {

      var id = record.submitFields({
        type: recordType,
        id: internalId,
        values: {
          custrecord_ps_wht_taxcode_ap_item: apItemInternalId,
          custrecord_ps_wht_taxcode_ar_item: arItemInternalId

        },
        options: {
          ignoreMandatoryFields: true
        }
      });

    }
    function submitAPItem(internalId, recordType,apItemInternalId)
    {
      var id = record.submitFields({
        type: recordType,
        id: internalId,
        values: {
          custrecord_ps_wht_taxcode_ap_item: apItemInternalId,
        },
        options: {
          ignoreMandatoryFields: true
        }
      });


    }
    function submitARItem(internalId, recordType,arInternalId)
    {
      var id = record.submitFields({
        type: recordType,
        id: internalId,
        values: {
          custrecord_ps_wht_taxcode_ar_item: arInternalId,
        },
        options: {
          ignoreMandatoryFields: true
        }
      });
    } 

     function getAllResults(search)
       {
   
           var all =[];
           log.debug("search PAge",search.pageRanges)
   
           search.pageRanges.forEach(function(pageRange){
               var this_page = search.fetch({index : pageRange.index});
               all = all.concat(this_page.data);
           });
           return all;
        }

    return {
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    }


  }


);