var Backbone = require('backbone');
var CoreView = require('backbone/core-view');
var ScrollView = require('../../../components/scroll/scroll-view');
var ViewFactory = require('../../../components/view-factory');
var analysisPlaceholderTemplate = require('./analyses/analyses-placeholder.tpl');
var AnalysisFormView = require('./analyses/analysis-form-view');
var AnalysesWorkflowView = require('./analyses/analyses-workflow-view');
var AnalysisControlsView = require('./analyses/analysis-controls-view');

/**
 * LayerContentAnalysesView:
 *   ├── ScrollView
 *   |   └── ListView:
 *   |       ├── WorkflowView
 *   |       └── FormTypeView
 *   └── ControlsView
 */
module.exports = CoreView.extend({

  options: {
    selectedNodeId: false // or an id, e.g. 'a1'
  },

  initialize: function (opts) {
    if (!opts.userActions) throw new Error('userActions is required');
    if (!opts.analysis) throw new Error('analysis is required');
    if (!opts.analysisFormsCollection) throw new Error('analysisFormsCollection is required');
    if (!opts.layerDefinitionModel) throw new Error('layerDefinitionModel is required');
    if (!opts.configModel) throw new Error('configModel is required');

    this._userActions = opts.userActions;
    this._analysis = opts.analysis;
    this._analysisFormsCollection = opts.analysisFormsCollection;
    this._layerDefinitionModel = opts.layerDefinitionModel;
    this._configModel = opts.configModel;
    this._userModel = opts.userModel;

    this._viewModel = new Backbone.Model({selectedNodeId: this.options.selectedNodeId});

    // Init listeners
    this._viewModel.on('change:selectedNodeId', this.render, this);
    this.add_related_model(this._viewModel);

    this._layerDefinitionModel.on('change:source', this._onLayerDefSourceChanged, this);
    this.add_related_model(this._layerDefinitionModel);

    this._analysisFormsCollection.on('add', this._onFormModelAdded, this);
    this._analysisFormsCollection.on('remove', this._onFormModelRemoved, this);
    this.add_related_model(this._analysisFormsCollection);
  },

  render: function () {
    this.clearSubViews();

    if (this._analysisFormsCollection.isEmpty()) {
      this.$el.html(analysisPlaceholderTemplate({
        layerId: this._layerDefinitionModel.id
      }));
    } else {
      this.$el.empty();
      var formModel = this._formModel();
      this._renderScrollableListView(formModel);
      this._renderControlsView(formModel);
    }

    return this;
  },

  clean: function () {
    CoreView.prototype.clean.apply(this, arguments);
    this._selectedNodeId(null, {silent: true});
    this.viewModel = null;
  },

  _renderScrollableListView: function (formModel) {
    var self = this;

    var view = new ScrollView({
      createContentView: function () {
        return ViewFactory.createListView([
          function () {
            return new AnalysesWorkflowView({
              analysis: self._analysis,
              layerDefinitionModel: self._layerDefinitionModel,
              analysisFormsCollection: self._analysisFormsCollection,
              viewModel: self._viewModel
            });
          },
          function () {
            return new AnalysisFormView({
              formModel: formModel,
              configModel: self._configModel,
              userModel: self._userModel
            });
          }
        ]);
      }
    });
    this.$el.append(view.render().el);
    this.addView(view);
  },

  _renderControlsView: function (formModel) {
    var view = new AnalysisControlsView({
      userActions: this._userActions,
      formModel: formModel
    });
    this.addView(view);
    this.$el.append(view.render().el);
  },

  _formModel: function () {
    return this._analysisFormsCollection.get(this._selectedNodeId()) || this._analysisFormsCollection.first();
  },

  _selectedNodeId: function () {
    if (arguments.length === 0) {
      return this._viewModel.get('selectedNodeId');
    } else {
      this._viewModel.set('selectedNodeId', arguments[0], arguments[1]);
    }
  },

  _onLayerDefSourceChanged: function () {
    this._analysisFormsCollection.resetByLayerDefinition();
    this._renderWithDefaultNodeSelected();
  },

  _onFormModelAdded: function () {
    this._renderWithDefaultNodeSelected();
  },

  _onFormModelRemoved: function () {
    this._renderWithDefaultNodeSelected();
  },

  _renderWithDefaultNodeSelected: function () {
    var selectedNodeId = this._analysisFormsCollection.pluck('id')[0];
    this._selectedNodeId(selectedNodeId, {silent: true});
    this.render();
  }

});
