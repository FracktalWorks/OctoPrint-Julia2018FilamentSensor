$(function() {
    function JFSViewModel(parameters) {
        var self = this;

        self.popup = undefined;

        self.Config = undefined;
        self.VM_settings = parameters[0];
        self.VM_printerState = parameters[1];
        self.VM_printerProfiles = parameters[2];

        self.showGeneral = ko.observable(true);
        self.showExtruder0 = ko.observable(false);
        self.showExtruder0Config = ko.observable(false);
        self.hasExtruder1 = ko.observable(false);
        self.showExtruder1 = ko.observable(false);
        self.showExtruder1Config = ko.observable(false);
        self.showDoor = ko.observable(false);
        self.showDoorConfig = ko.observable(false);


        self.toggleGeneral = function(){
            self.showGeneral(!self.showGeneral());
        }
        self.toggleExtruder0 = function(){
            self.showExtruder0(!self.showExtruder0());
        }
        self.toggleExtruder1 = function(){
            self.showExtruder1(!self.showExtruder1());
        }
        self.toggleDoor = function(){
            self.showDoor(!self.showDoor());
        }

        self.showPopup = function(msg, msgType, hide=true){
            if (self.popup !== undefined){
                self.closePopup();
            }
            var data = {
                title: 'Julia Filament Sensor',
                text: msg,
                type: msgType,
                hide: hide
            };
            self.popup = new PNotify(data);
        };

        self.closePopup = function() {
            if (self.popup !== undefined) {
                self.popup.remove();
            }
        };


        self.onBeforeBinding = function() {
            console.log('Binding JFSViewModel')

            self.Config = self.VM_settings.settings.plugins.Julia2018FilamentSensor;

            var currentProfileData = self.VM_printerProfiles.currentProfileData();
            if (currentProfileData && currentProfileData.hasOwnProperty('extruder')) {
                currentProfileData.extruder.count.subscribe(function(value) {
                    self.hasExtruder1(value == 2);
                    self.showExtruder1Config(self.hasExtruder1() && self.Config.enabled_extruder1() == 1);
                });
            } else {
                self.hasExtruder1(false);
            }

            self.Config.enabled_extruder0.subscribe(function(value) {
                self.showExtruder0Config(value == 1);
            });
            self.Config.enabled_extruder1.subscribe(function(value) {
                self.showExtruder1Config(self.hasExtruder1() && value == 1);
            });
            self.Config.enabled_door.subscribe(function(value) {
                self.showDoorConfig(value == 1);
            });

            // console.log(self.VM_printerProfiles);

            self.testStatus();
        };

        self.onSettingsShown = function() {
            var currentProfileData = self.VM_printerProfiles.currentProfileData();

            if (currentProfileData && currentProfileData.hasOwnProperty('extruder')) {
                self.hasExtruder1(currentProfileData.extruder.count() == 2);
            } else {
                self.hasExtruder1(false);
            }
            // self.hasExtruder1(self.VM_printerProfiles.currentProfileData.extruder.count == 2);

            // console.log(self.Config.enabled_extruder0());
            self.showExtruder0Config(self.Config.enabled_extruder0() == 1);
            self.showExtruder1Config(self.hasExtruder1() && self.Config.enabled_extruder1() == 1);
            self.showDoorConfig(self.Config.enabled_door() == 1);
        };

        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin != "Julia2018FilamentSensor") {
                // console.log('Ignoring '+plugin);
                return;
            }

            if (data.type != "popup")
                return;

            self.showPopup(data.msg, data.msgType, (data && data.hasOwnProperty('hide') ? data.hide : true));
        };

        self.testStatus = function(data) {
            var status = function(x) {
                switch (x) {
                    case -1:
                        return "Sensor disabled";
                    case 0:
                        return "Outage!";
                    case 1:
                        return "Filament loaded"
                    default:
                        return "Error"
                }
            };

            var status_door = function(x) {
                switch (x) {
                    case -1:
                        return "Sensor disabled";
                    case 0:
                        return "Open!";
                    case 1:
                        return "Closed"
                    default:
                        return "Error"
                }
            };

            $.ajax("/plugin/Julia2018FilamentSensor/status")
            .success(function(data) {
                var msg ="";
                console.log(data);

                if(data.hasOwnProperty('extruder0'))
                    msg += "<b>Extruder 0:</b> " + status(data['extruder0']) + "<br/>";

                if(data.hasOwnProperty('extruder1') && data['extruder1'] != undefined)
                    msg += "<b>Extruder 1:</b> " + status(data['extruder1']) + "<br/>";
                
                if(data.hasOwnProperty('door') && data['door'] != -1)
                    msg += "<b>Door:</b> " + status_door(data['door']);

                self.onDataUpdaterPluginMessage("Julia2018FilamentSensor", {type: 'popup', msg, msgType:'info', hide:false});
            })
            .fail(function(req, status) {
                console.log(status)
                self.onDataUpdaterPluginMessage("Julia2018FilamentSensor", {msg: "Error", type:'info', hide:false});
            });
        };
    };


    // This is how our plugin registers itself with the application, by adding some configuration
    // information to the global variable OCTOPRINT_VIEWMODELS
    ADDITIONAL_VIEWMODELS.push([
        // This is the constructor to call for instantiating the plugin
        JFSViewModel,

        // This is a list of dependencies to inject into the plugin, the order which you request
        // here is the order in which the dependencies will be injected into your view model upon
        // instantiation via the parameters argument
        ["settingsViewModel", "printerStateViewModel", "printerProfilesViewModel"],

        // Finally, this is the list of selectors for all elements we want this view model to be bound to.
        ["#settings_j18fs"]
    ]);
});