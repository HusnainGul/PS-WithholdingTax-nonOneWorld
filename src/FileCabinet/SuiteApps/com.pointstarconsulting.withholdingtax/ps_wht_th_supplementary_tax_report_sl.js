/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define(['N/ui/serverWidget', 'N/search', 'N/record', 'N/task', 'N/runtime','N/config'],
    function(ui, search, record, nstask, runtime,config) {

        function onRequest(context) {
            let request = context.request;
            let response = context.response;
            let params = request.parameters;

            try {

                if (request.method === 'GET') {
                    log.debug('GET params', params);
                    getHandler(request, response, params, context.request);
                } else {
                    postHandler(request, response, params);
                }
            } catch (e) {
                log.error('Error::onRequest', e);
                response.writeLine({ output: 'Error: ' + e.name + ' , Details: ' + e.message });
            }

        }

        function getHandler(request, response, params, context) 
        {

 
            // Check if the account is OneWorld and Multi-Book
            var isOneWorld = runtime.isFeatureInEffect({ feature: 'SUBSIDIARIES' });
            var isMultiBook = runtime.isFeatureInEffect({ feature: 'MULTIBOOK' });

          

            let form = ui.createForm({
                title: 'Supplementary Tax Report'
            });
            form.clientScriptModulePath = './ps_wht_th_supplementary_tax_report_cs.js';


            form.addButton({
                id: 'custpage_cover_page',
                label: 'Input Tax (PDF)',
                functionName: `printPdf('inputtaxreport')`
            });

            form.addButton({
                id: 'custpage_attachment',
                label: 'Input Tax (Excel)',
                functionName: `downloadExcel('inputtaxreportexcel')`
            });

            form.addButton({
                id: 'custpage_cover_page',
                label: 'Output Tax (PDF)',
                functionName: `printPdf('outputtaxreport')`
            });

            form.addButton({
                id: 'custpage_attachment', 
                label: 'Output Tax (Excel)',
                functionName: `downloadExcel('outputtaxreportexcel')`
            });

            var htmlImage = form.addField({
                 id: 'custpage_htmlfield',
                 type: ui.FieldType.INLINEHTML,
                 label: 'HTML Image'
                });
                 htmlImage.defaultValue = '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.2/xlsx.full.min.js"></script>' 

          

                form.addFieldGroup({
                    id: 'custpage_criteria',
                    label: 'Criteria'
                });

                form.addFieldGroup({
                    id: 'custpage_information',
                    label: 'Information'
                });

                log.debug("check log", params)



                let subsidiaryFld = form.addField({
                    id: 'custpage_subsidiary_fld',
                    type: ui.FieldType.SELECT,
                    label: 'Subsidiary',
                    container: 'custpage_criteria'
                });
            
                 let subsidiaryBranchFld = form.addField({
                    id: 'custpage_subs_branch_fld',
                    type: ui.FieldType.SELECT,
                    label: 'Subsidiary Branch',
                    container: 'custpage_criteria'
                });
                 subsidiaryBranchFld.addSelectOption({
                            value:"",
                            text: ""
                        });
                 
                


                if (isOneWorld) 
                {
                    let subsidiaryList = getRecordsList('subsidiary');
                    subsidiaryFld.addSelectOption({
                        value: "",
                        text: ""
                    });
                    

                    subsidiaryList.map(function(option) {
                        subsidiaryFld.addSelectOption({
                            value: option.id,
                            text: option.name
                        });

                    })

                     let subsidiaryBranchList = getSubsidaryBranch(isNull(params.subsidiary))

                  log.debug("subsidiaryBranchList", subsidiaryBranchList)

               
                
                 if (subsidiaryBranchList) {
                    subsidiaryBranchList.map(function(option) {
                        subsidiaryBranchFld.addSelectOption({
                            value: option.id,
                            text: option.name
                        });
                    })

                  }


 
                  subsidiaryFld.defaultValue = isNull(params.subsidiary);

                  subsidiaryBranchFld.defaultValue = isNull(params.subsidiaryBranch);


                 }
                 else if(!isOneWorld)
                 {
                     const info = config.load({type:config.Type.COMPANY_INFORMATION});

                     subsidiaryFld.addSelectOption({
                        value: "",
                        text: info.getValue({fieldId:'companyname'})
                     });


                    
                
                     log.debug("getSubsidaryBranchWithOutOneWorld",getSubsidaryBranchWithOutOneWorld())
                
                     getSubsidaryBranchWithOutOneWorld().map(function(option) {
                        subsidiaryBranchFld.addSelectOption({
                            value: option.id,
                            text: option.name
                        });
                     })
                 }
               
            if (isMultiBook) 
            {

                let accountingBookFld = form.addField({
                    id: 'custpage_wht_acc_book_fld',
                    type: ui.FieldType.SELECT,
                    label: 'Accounting Book',
                    container: 'custpage_criteria'
                });

                let accountingBookList = getRecordsList('accountingbook');

                accountingBookFld.addSelectOption({
                    value: "",
                    text: ""
                });
                accountingBookList.map(function(option) {
                    accountingBookFld.addSelectOption({
                        value: option.id,
                        text: option.name
                    });
                })

                accountingBookFld.defaultValue = isNull(params.whtAccountingBook);
            }


            let whtPeriodFld = form.addField({
                id: 'custpage_wht_period_fld',
                type: ui.FieldType.SELECT,
                label: 'Posting Period',
                container: 'custpage_criteria',
                source: 'accountingperiod'
            });

            let whtFilingStatusFld = form.addField({
                id: 'custpage_wht_filing_status_fld',
                type: ui.FieldType.SELECT,
                label: 'Tax Filing Status',
                container: 'custpage_criteria',

            });

            let filingStatusList = getRecordsList('customrecord_ps_tht_wht_filing_status');
            whtFilingStatusFld.addSelectOption({
                value: "",
                text: ""
            });
            filingStatusList.map(function(option) {
                whtFilingStatusFld.addSelectOption({
                    value: option.id,
                    text: option.name
                });
            })
 

             let taxCodeFld = form.addField({
                    id: 'custpage_taxcode_fld',
                    type: ui.FieldType.MULTISELECT,
                    label: 'Tax Code',
                    container: 'custpage_criteria',
                    source:'salestaxitem'
                });

                // let groupByTaxCodeFld = form.addField({
                //     id: 'custpage_grptaxcode_chk',
                //     type: ui.FieldType.CHECKBOX,
                //     label: 'Group by Tax Code',
                //     container: 'custpage_criteria',
                // });



              

            let informationFld = form.addField({
                id: 'custpage_information_fld',
                type: ui.FieldType.INLINEHTML,
                label: 'Information',
                container: 'custpage_information'
            });


           

            whtFilingStatusFld.defaultValue = isNull(params.whtFilingStatus);


         
            whtPeriodFld.defaultValue = isNull(params.whtTaxPeriod);



            // informationFld.defaultValue = '<p>Require TH sarabun New Font For Excel Report <a href="#">Download</a></p>'


            response.writePage(form);

        }


        function postHandler(request, response) 
        {

        }

        function getRecordsList(type) 
        {
            try {

                let customrecord_ps_tht_wht_categorySearchObj = search.create({
                    type: type,
                    filters: [],
                    columns: [
                        "internalid", "name"
                    ]
                });
                let reportResults = customrecord_ps_tht_wht_categorySearchObj.run().getRange({
                    start: 0,
                    end: 1000
                });

                let internalId;
                let name;
                let data = [];

                log.debug("reportResults: " + type, reportResults)

                for (let i in reportResults) {
                    internalId = reportResults[i].getValue('internalid')
                    name = reportResults[i].getValue('name')
                    data.push({ id: internalId, name: name })
                }

                log.debug("data: ", data)

                return data

            } catch (e) {
                log.debug("error: ", e.message)
                return [{ id: '', name: '' }]
            }

        }


        function getRecordsListAccountingPeriod(type) {
            try {

                let customrecord_ps_tht_wht_categorySearchObj = search.create({
                    type: type,
                    filters: [],
                    columns: [
                        "internalid", "periodname"
                    ]
                });
                let reportResults = customrecord_ps_tht_wht_categorySearchObj.run().getRange({
                    start: 0,
                    end: 1000
                });

                let internalId;
                let name;
                let data = [];

                log.debug("reportResults: " + type, reportResults)

                for (let i in reportResults) {
                    internalId = reportResults[i].getValue('internalid')
                    name = reportResults[i].getValue('periodname')
                    data.push({ id: internalId, name: name })
                }

                log.debug("data: ", data)

                return data

            } catch (e) {
                log.debug("error: ", e.message)
                return [{ id: '', name: '' }]
            }

        }

        function getSubsidaryBranch(subsidiary) {

            log.debug("subsidiary in function", subsidiary)
            if (!subsidiary) {
                return
            }

            let cseg_subs_branchSearchObj = search.create({
                type: "customrecord_cseg_subs_branch",
                filters: [
                    ["custrecord_ps_wht_subs_brn_filterby_subs", "anyof", subsidiary]
                ],
                columns: [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC,
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "internalid",
                        label: "Internal Id"
                    }),
                ]
            });

            let reportResults = cseg_subs_branchSearchObj.run().getRange({
                start: 0,
                end: 1000
            });

            let internalId;
            let name;
            let data = [];

            for (let i in reportResults) {
                internalId = reportResults[i].getValue('internalid')
                name = reportResults[i].getValue('name')
                data.push({ id: internalId, name: name })
            }

            log.debug("data: ", data)

            return data
        }

        function getSubsidaryBranchWithOutOneWorld() {

           
            let cseg_subs_branchSearchObj = search.create({
                type: "customrecord_cseg_subs_branch",
                filters: [],
                columns: [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC,
                        label: "Name"
                    }),
                    search.createColumn({
                        name: "internalid",
                        label: "Internal Id"
                    }),
                ]
            });

            let reportResults = cseg_subs_branchSearchObj.run().getRange({
                start: 0,
                end: 1000
            });

            let internalId;
            let name;
            let data = [];

            for (let i in reportResults) {
                internalId = reportResults[i].getValue('internalid')
                name = reportResults[i].getValue('name')
                data.push({ id: internalId, name: name })
            }

            log.debug("data: ", data)

            return data
        }


        function isNull(value) {
            if ((value != null) && (value != 'null') && (value != '') && (value != undefined) && (value != 'undefined') && (value != 'NaN') && (value != ' ')) return value;
            else return '';
        }




        return {
            onRequest: onRequest
        };
    });