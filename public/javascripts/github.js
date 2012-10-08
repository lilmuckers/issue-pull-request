function GitHub(){
  //set up the initial stuff
  
  //fork selection items
  this.forkSelect = $('#fork-select');
  
  //base branch selection items
  this.baseBranch = {
    containers: $('.base-branch'),
    select: $('#base-branch-select')
  }
  
  //head branch selection items
  this.headBranch = {
    containers: $('.head-branch'),
    select: $('#head-branch-select')
  }
  
  //issue selection
  this.issues = {
    containers: $('.issues'),
    select: $('#issue-select')
  }
  
  this.finishButton = {
    containers: $('.submit'),
    button: $('#finish').find('button')
  }
  
  this.alertsArea = $('.alerts');
  
  //set up initial PR info
  this.resetPullInfo();
  
  //overlay
  this.overlay = $('.overlay');
  
  //run the magic
  this.initialise();
}

GitHub.prototype.initialise = function(){
  this.forkSelect.find('.dropdown-menu li').click(this.handleDropdown);
  
  this.forkSelect.bind('selection', $.proxy(this.forkSelectEvent, this));
  this.baseBranch.select.bind('selection', $.proxy(this.baseBranchSelect, this));
  this.headBranch.select.bind('selection', $.proxy(this.headBranchSelect, this));
  this.issues.select.bind('selection', $.proxy(this.issueSelect, this));
  
  this.finishButton.button.click($.proxy(this.submitData, this));
  
  this.formatTooltips();
}

GitHub.prototype.formatTooltips = function(){
  var tooltipAnchors = $('h3 i');
  
  for(var k in tooltipAnchors){
    var anchor = $(tooltipAnchors[k]);
    anchor.popover({
      placement: 'bottom',
      trigger: 'hover',
      title: anchor.parent().parent().find('div.tooltip h3').html(),
      content: anchor.parent().parent().find('div.tooltip p').html()
    });
  }
}

GitHub.prototype.baseBranchSelect = function(){
  var baseBranch = this.baseBranch.select.data('selected');
  this.pullRequestInformation.base.branch = baseBranch;
  this.unlockSubmit();
}

GitHub.prototype.headBranchSelect = function(){
  var headBranch = this.headBranch.select.data('selected');
  this.pullRequestInformation.head.branch = headBranch;
  this.unlockSubmit();
}

GitHub.prototype.issueSelect = function(){
  var issue = this.issues.select.data('selected');
  this.pullRequestInformation.issue = issue;
  //this.issueSummery();
  this.unlockSubmit();
}

GitHub.prototype.unlockSubmit = function(){
  if( this.isReadyToGo() ){
    //enable the button
    this.finishButton.button.removeClass('disabled');
    this.finishButton.button.removeAttr("disabled");
  } else {
    //disable the button
    if(!this.finishButton.button.hasClass('disabled')){
      this.finishButton.button.addClass('disabled');
    }
    this.finishButton.button.attr("disabled", "disabled");
  }
}

GitHub.prototype.isReadyToGo = function(){
 if(this.pullRequestInformation.user
    && this.pullRequestInformation.base.owner
    && this.pullRequestInformation.base.repo
    && this.pullRequestInformation.base.branch
    && this.pullRequestInformation.head.branch
    && this.pullRequestInformation.issue){
      return true;
    } else {
      return false;
    }
}

GitHub.prototype.handleDropdown = function(){
  //make it selected
  $(this).siblings().removeClass('selected');
  $(this).addClass('selected');
  
  //update the header portion
  var button = $(this).parents('.btn-group')
  var buttonLink = button.find('a.btn');
  var textNode = buttonLink.contents().first();
  
  //store the original text, just incase
  buttonLink.data('oldText', textNode.text());
  
  //replace text with selected text
  textNode.remove();
  buttonLink.prepend($(this).text());
  
  //store the selected data for the events use
  button.data('selected', $(this).data('object'));
  
  //fire an event off the container div
  button.trigger('selection');
}

GitHub.prototype.populateDropdown = function(dropdown, data){
  //remove all previous elements
  dropdown.find('.dropdown-menu li').remove();
  
  //replace original text if needs be
  var buttonLink = dropdown.find('a.btn');
  var textNode = buttonLink.contents().first();
  if(buttonLink.data('oldText')){
    textNode.remove();
    buttonLink.prepend(buttonLink.data('oldText'));
  }
  
  //build and append the new list items
  var selected = null;
  for(var k in data){
    var item = data[k];
    var ddItem = $('<li data-object="'+item.value+'"><a href="#">'+item.label+'</a></li>');
    ddItem.click(this.handleDropdown);
    dropdown.find('.dropdown-menu').append(ddItem);
    
    //if this should be preselected
    if(item.selected){
      selected = ddItem;
    }
  }
  
  //now we handle the selected
  if(selected){
    selected.click();
  }
}

GitHub.prototype.submitData = function(){
  if(this.isReadyToGo()){
    this.showOverlay();
    $.post('/create-pull', this.pullRequestInformation, $.proxy(this.pullRequestResponse, this));
  }
  return false;
}

GitHub.prototype.pullRequestResponse = function(data, status, xhr){
  if(data.html_url){
    window.location.replace(data.html_url);
  } else {
    this.alert('An unknown error occurred at github', 'error');
    this.hideOverlay();
  }
}

GitHub.prototype.forkSelectEvent = function(){
  //get the selected repo from the data
  var data = { repo: this.forkSelect.data('selected') };
  
  //bring up the overlay
  this.showOverlay();
  
  //fadeOut the containers if needed
  if(this.headBranch.containers.is(':visible')){
    this.headBranch.containers.fadeOut();
  }
  if(this.baseBranch.containers.is(':visible')){
    this.baseBranch.containers.fadeOut();
  }
  if(this.issues.containers.is(':visible')){
    this.issues.containers.fadeOut();
  }
  if(this.finishButton.containers.is(':visible')){
    this.finishButton.containers.fadeOut();
  }
  
  //perform the ajax request
  $.post('/repo-select', data, $.proxy(this.formatForkSelectResponse, this));
}

GitHub.prototype.resetPullInfo = function(){
  this.pullRequestInformation = {
    user: '',
    base: {
      owner: '',
      repo: '',
      branch: ''
    },
    head: {
      branch: ''
    },
    issue: ''
  }
}

GitHub.prototype.showOverlay = function(){
  this.overlay.fadeIn(500);
}
GitHub.prototype.hideOverlay = function(){
  this.overlay.fadeOut(500);
}

GitHub.prototype.formatForkSelectResponse = function(data, status, xhr){
  //reset the pull request information
  this.resetPullInfo();
  
  //make sure it all went well
  if(status != 'success'){
    this.hideOverlay();
    this.alert('Unknown error, please reload and try again', error);
    return;
  }
  
  //build the head branch list and display it
  this.buildBranchList(data.head.branches, this.headBranch.select);
  this.headBranch.containers.fadeIn();
  
  //update the small link on the base branch list
  var link = this.baseBranch.containers.find('h3 small a');
  link.attr('href', data.base.repo.html_url);
  link.text(data.base.repo.full_name);
  
  //build the base branch list and display it
  this.buildBranchList(data.base.branches, this.baseBranch.select, true);
  this.baseBranch.containers.fadeIn();
  
  //update the issue link
  var link = this.issues.containers.find('h3 small a');
  link.attr('href', data.base.repo.html_url+'/issues');
  
  //build the list of issues and display it
  this.buildIssueList(data.base.issues);
  this.issues.containers.fadeIn();
  
  //show the finish button
  this.finishButton.containers.fadeIn();
  
  //hide the overlay
  this.hideOverlay();
  
  //now we need to set up the base information for the pull
  this.pullRequestInformation.user = data.head.repo.owner.login;
  this.pullRequestInformation.base.owner = data.base.repo.owner.login;
  this.pullRequestInformation.base.repo = data.base.repo.name;
}

GitHub.prototype.buildIssueList = function(data){
  //arrange the data for the population script
  var issueDropdownData = [];
  for(var k in data){
    var issue = data[k];
    var issueData = {
      value: issue.number,
      label: '#'+issue.number+' - '+issue.title,
      selected: false
    }
    issueDropdownData.push(issueData);
  }
  
  //run the population script
  this.populateDropdown(this.issues.select, issueDropdownData);
}

GitHub.prototype.buildBranchList = function(data, dropdown, master){
  //arrange the data for the population script
  var branchDropdownData = [];
  for(var k in data){
    var branch = data[k];
    var branchData = {
      value: branch.name,
      label: branch.name,
      selected: false
    }
    
    //check if master should be selected
    if(master && branch.name == 'master'){
      branchData.selected = true;
    }
    
    branchDropdownData.push(branchData);
  }
  //run the population script
  this.populateDropdown(dropdown, branchDropdownData);
}

GitHub.prototype.alert = function(message, warn){
  switch(warn){
    case 'error':
      var classname = 'alert-error';
      var msg = 'Error!';
      break;
    case 'warning':
    default:
      var classname = '';
      var msg = 'Warning!';
      break;
  }

  var alert = $('<div class="alert hide '+classname+'"><button type="button" class="close" data-dismiss="alert">x</button><strong>'+msg+'</strong> '+message+'</div>');
  this.alertsArea.append(alert);
  alert.slideDown(100);
}

var github = new GitHub();